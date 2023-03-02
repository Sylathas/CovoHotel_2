import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

import { Engine, Scene, Vector3, Mesh, MeshBuilder, FreeCamera, Color4, StandardMaterial, Color3, PointLight, ShadowGenerator, Quaternion, Matrix, SceneLoader, GlowLayer, CubeTexture, Texture, PointerEventTypes, Ray, Animation, PickingInfo, Sound} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, Image, Container } from "@babylonjs/gui";
import { Environment } from "./environment";
import { Player } from "./characterController";
import { PlayerInput } from "./inputController";
import { NPC } from "./NPC";
import { InteractObject } from "./interactObject";
import { theFramework } from "./multiplayer"
import { uiElement } from "./uiElement";
import { io, Socket } from "socket.io-client";

enum State { START = 0, GAME = 1, LOSE = 2, CUTSCENE = 3 }

class App {
    //General Entire Application
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    //Game State Related
    public assets;
    public otherAssets = [];
    private _input: PlayerInput;
    private _environment;
    private _player: Player;
    private _npc: NPC[] = [];
    private _interactObject: InteractObject[] = [];
    private _environmentTexture: string = "textures/envtext.env"; //environment texture for HDRI and skybox
    private _playerModel: string = "player.glb"; //mesh of the player
    private _otherModels: string[] = ['player.glb']; //mesh of npcs and interactive objects

    //Scene - related
    private _state: number = 0;
    private _gamescene: Scene;
    private _cutScene: Scene;

    //Camera related
    private shadowGenerator;
    private _mouseDown: boolean = false;

    //Camera Raycasting
    private _hits: PickingInfo[] = [];
    private _fadeAnimation: Animation;

     //Multiplayer
    private socket = theFramework.socket;
    private users = {};
    private playersIndex = 3;

    //Tools for syncronizing
    private deltaTime: number;

    constructor() {
        this._canvas = this._createCanvas();

        // initialize babylon scene and engines
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        //Construct animations
        this._fadeAnimation = new Animation("fade", "visibility", 30, Animation.ANIMATIONTYPE_FLOAT);

        //Create keyframes
        const keyFrames = []; 
        keyFrames.push({
            frame: 0,
            value: 1
        });

        keyFrames.push({
            frame: 30,
            value: 0.1
        });

        this._fadeAnimation.setKeys(keyFrames);

        

        // run the main render loop 
        this._main();
    }

    private _createCanvas(): HTMLCanvasElement {

        //Commented out for development
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        //create the canvas html element and attach it to the webpage
        this._canvas = document.createElement("canvas");
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.id = "gameCanvas";
        document.body.appendChild(this._canvas);

        return this._canvas;
    }

    private async _main(): Promise<void> {
        await this._goToStart();

        // Register a render loop to repeatedly render the scene
        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                    this._scene.render();
                    break;
                case State.CUTSCENE:
                    this._scene.render();
                    break;
                case State.GAME:
                    this._scene.render();
                    break;
                case State.LOSE:
                    this._scene.render();
                    break;
                default: break;
            }
        });

        //resize if the screen is resized/rotated
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

    private async _goToStart() {
        this._engine.displayLoadingUI();

        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        //create a fullscreen ui for all of our GUI elements
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        guiMenu.idealHeight = 720; //fit our fullscreen ui to this height

        //create a simple button
        const startBtn = Button.CreateSimpleButton("start", "PLAY");
        startBtn.width = 0.2
        startBtn.height = "40px";
        startBtn.color = "white";
        startBtn.top = "-14px";
        startBtn.thickness = 0;
        startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        guiMenu.addControl(startBtn);

        //this handles interactions with the start button attached to the scene
        startBtn.onPointerDownObservable.add(() => {
            this._goToGame();
        });

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();
        //lastly set the current state to the start state and set the scene to the start scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;

        //--START LOADING AND SETTING UP THE GAME DURING THIS SCENE--
        var finishedLoading = false;
        await this._setUpGame().then(res => {
            finishedLoading = true;
        });
    }

    private async _setUpGame() {
        let scene = new Scene(this._engine);
        this._gamescene = scene;

        //--CREATE ENVIRONMENT--
        const environment = new Environment(scene);
        this._environment = environment;
        await this._environment.load(); //environment
        await this._loadCharacterAssets(scene, this._playerModel);
        await this._loadOtherAssets(scene, this._otherModels);
    }

    private async _loadCharacterAssets(scene, playerModel) {

        async function loadCharacter(playerModel) {
            //collision mesh
            const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;

            //move origin of box collider to the bottom of the mesh (to match player mesh)
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))

            //for collisions 
            outer.ellipsoid = new Vector3(1, 1.5, 1);
            outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

            outer.rotationQuaternion = new Quaternion(0, 1, 0, 0); // rotate the player mesh 180 since we want to see the back of the player

            return SceneLoader.ImportMeshAsync(null, "./models/", playerModel, scene).then((result) => {
                const root = result.meshes[0];
                //body is our actual player mesh
                const body = root;
                body.parent = outer;
                body.isPickable = false; //so our raycasts dont hit ourself
                body.getChildMeshes().forEach(m => {
                    m.isPickable = false;
                })

                return {
                    mesh: outer as Mesh,
                }
            });
        }
        return loadCharacter(playerModel).then(assets => {
            this.assets = assets;
        })

    }

    private async _loadOtherAssets(scene, otherModels) {
        otherModels.forEach((model) => {
            return SceneLoader.ImportMeshAsync(null, "./models/", model, scene).then((result) => {
                //click event mesh
                const outer = MeshBuilder.CreateBox(model, { width: 2, depth: 1, height: 3 }, scene);
                outer.visibility = 0;
                outer.isPickable = true;

                //move origin of box collider to the bottom of the mesh (to match player mesh)
                outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))//collision mesh

                const root = result.meshes[0];
                //body is our actual NPC mesh
                const body = root;
                body.parent = outer;
                body.isPickable = false; //the click trigger is the outer mesh, not the player
                body.getChildMeshes().forEach(m => {
                    m.isPickable = false;
                })

                this.otherAssets.push(outer);
            });
        });
    }

    private async _initializeGameAsync(scene): Promise<void> {
        scene.ambientColor = new Color3(0.34509803921568627, 0.5568627450980392, 0.8352941176470589);
        scene.clearColor = new Color4(0.01568627450980392, 0.01568627450980392, 0.20392156862745098);

        const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
        light.diffuse = new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825);
        light.intensity = 35;
        light.radius = 1;

        this.shadowGenerator = new ShadowGenerator(1024, light);
        this.shadowGenerator.darkness = 0.4;

        //Create the player
        this._player = new Player(this.assets, scene, this.shadowGenerator, this._canvas, this._input);
        const camera = this._player.activatePlayerCamera();

        //Create NPC
        this._npc.push(new NPC(scene, this.shadowGenerator, this._canvas, "player.glb", new Vector3(0,30,20)));
        this._npc.push(new NPC(scene, this.shadowGenerator, this._canvas, "player.glb", new Vector3(0,40,20)));

        this._interactObject.push(new InteractObject(scene, this.shadowGenerator, this._canvas, "player.glb", new Vector3(10,30,20)));

        //glow layer
        const gl = new GlowLayer("glow", scene);
        gl.intensity = 0.4;
        //webpack served from public
    }

    private async _goToGame() {
        //--SETUP SCENE--
        this._scene.detachControl();
        let scene = this._gamescene;
        scene.clearColor = new Color4(0.01568627450980392, 0.01568627450980392, 0.20392156862745098); // a color that fit the overall color scheme better

        //--GUI--
        const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        //Create first menu container
        var menu1 = new Container('menu1');
        menu1.width = "500px";
        menu1.height = "250px";
        menu1.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        menu1.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        playerUI.addControl(menu1);

        //Create first menu UI
        var image = uiElement("menu1img", "/textures/UI/Menu1.png", 1, 1, false);
        menu1.addControl(image);

        //Create first button
        var bot1 = uiElement("bot1", "/textures/UI/Bot1.png", '100px', "120px", true, "20px", "20px", Control.VERTICAL_ALIGNMENT_BOTTOM, Control.HORIZONTAL_ALIGNMENT_LEFT);
        menu1.addControl(bot1);

        //Create second button
        var bot2 = uiElement("bot2", "/textures/UI/Bot1.png", '60px', "80px", true, "140px", "20px", Control.VERTICAL_ALIGNMENT_BOTTOM, Control.HORIZONTAL_ALIGNMENT_LEFT);
        menu1.addControl(bot2);

        //Create third button
        var bot3 = uiElement("bot3", "/textures/UI/Bot1.png", '60px', "80px", true, "230px", "20px", Control.VERTICAL_ALIGNMENT_BOTTOM, Control.HORIZONTAL_ALIGNMENT_LEFT);
        menu1.addControl(bot3);

        //Create second menu container
        var menu2 = new Container('menu2');
        menu2.width = "350px";
        menu2.height = "125px";
        menu2.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        menu2.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        playerUI.addControl(menu2);

        //Create second menu UI
        var image2 = uiElement("menu2img", "/textures/UI/Menu2.png", 1, 1, false);
        menu2.addControl(image2);

        //check if device is mobile or desktop, and change UI accordingly
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            menu1.rotation = Math.PI;
            menu1.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            menu1.width = 1;
            //menu1.height = menu1.width * .6;

            menu2.width = 1;
            //menu2.height = menu2.width * 0.25;
            image2.source = "/textures/UI/Menu2mobile.png";
            console.log(menu2);
            console.log(image2);
        }

        //dont detect any inputs from this ui while the game is loading
        scene.detachControl();

        //IBL (image based lighting) - to give scene an ambient light
        const envHdri = CubeTexture.CreateFromPrefilteredData(this._environmentTexture, scene);
        envHdri.name = "env";
        envHdri.gammaSpace = false;
        scene.environmentTexture = envHdri;
        scene.environmentIntensity = 0.04;

        //Create skybox
        const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
        const skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = CubeTexture.CreateFromPrefilteredData(this._environmentTexture, scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skybox.material = skyboxMaterial;

        //--INPUT--
        this._input = new PlayerInput(scene, this._canvas); //detect keyboard/mobile inputs

        //primitive character and setting
        await this._initializeGameAsync(scene);

        //--WHEN SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        scene.getMeshByName("outer").position = scene.getTransformNodeByName("startPosition").getAbsolutePosition(); //move the player to the start position
        //get rid of start scene, switch to gamescene and change states
        this._scene.dispose();
        this._state = State.GAME;
        this._scene = scene;
        this._scene.gravity = new Vector3(0, -0.15, 0);
        this._engine.hideLoadingUI();
        //the game is ready, attach control back
        this._scene.attachControl();

        //Add fade animation to all the meshes in the scene
        this._scene.meshes.forEach(mesh => {
            mesh.animations.push(this._fadeAnimation);
        });

        let lastMousePos = this._scene.pointerX;

        //Update the state of the mouseDown variable and lastMousePos depending on the mouse action and position
        this._scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERDOWN:
                    this._mouseDown = true;
                    break;
                case PointerEventTypes.POINTERUP:
                    this._mouseDown = false;
                    break;
                case PointerEventTypes.POINTERMOVE:
                    if (this._mouseDown) {
                        this._scene.cameras[0]._cache.parent.rotation.y += (this._scene.pointerX - lastMousePos) / 100;
                    }
                    lastMousePos = this._scene.pointerX;
                    break;
            }
        });

        this._scene.registerBeforeRender(() => {
            // Make meshes between player and camera turn transparent
            this._checkFrontCamera();
        });

        this._scene.registerAfterRender(() => {
            //Get time between last and this frame
            this.deltaTime = this._engine.getDeltaTime();      
        });

        //Multiplayer

        //Initialize
        this.socket.on('initialize', (arg) => {
            console.log("Connected Players: " + arg);
            console.log(arg);
        });

        //Create Other Users
        this.socket.on('newPlayer', (remoteSocketId) => {
            console.log("A new player joined with id: " + remoteSocketId);
            this.playersIndex = this.playersIndex + 1;
            this.otherAssets.push("player.glb");
            this.users[remoteSocketId] = new NPC(scene, this.shadowGenerator, this._canvas, "player.glb", new Vector3(this._scene.getMeshByName('outer').position.x, this._scene.getMeshByName('outer').position.y + 0.5, this._scene.getMeshByName('outer').position.z));
            console.log(this.users);
        });
        
        //Manage Other Users Movement
        this.socket.on('playerMoved', (remoteSocketId, posX, posY, posZ) => {
            if (this.users[remoteSocketId] == null) {
                this.users[remoteSocketId] = new NPC(scene, this.shadowGenerator, this._canvas, "player.glb", new Vector3(posX, posY, posZ));
            } else { this.users[remoteSocketId].mesh.position = new Vector3(posX, posY, posZ);}
        });

        //Delete disconnected player
        this.socket.on('deletePlayer', (arg) => {
            console.log("Player " + arg + " just disconnected from the server");
            this.users[arg].mesh.dispose();
            delete this.users[arg];
        });

        //Manage Sounds
        const music = new Sound("music", "/sounds/farnemolti.wav", scene, null,
          {
            autoplay: true, 
            loop: true,
            spatialSound: true,
          });
    }

    //Check if something is between the camera and the player
    private _checkFrontCamera() {

        //Create Raycast from camera to player
        let ray = Ray.CreateNewFromTo(
            this._scene.cameras[0].globalPosition,
            new Vector3(this._scene.getMeshByName('outer').position.x, this._scene.getMeshByName('outer').position.y + 0.5, this._scene.getMeshByName('outer').position.z)
        );
        
        //Check what meshes are hit by the ray
        const hits = this._scene.multiPickWithRay(ray);
        
        //If ray hits, start animation of disappearing
        if (hits){
            for (var i=0; i < hits.length; i++){
                this._scene.beginAnimation(hits[i].pickedMesh, 30, 0);
            }
         }

         //Make meshes hit before now appear
         this._hits.forEach(mesh => {
            hits.forEach(element => {
                if(mesh.pickedMesh.name == element.pickedMesh.name){
                    return
                }
                this._scene.beginAnimation(mesh, 0, 30);
            });
        });

        //Set meshes hit as a global variable to check next frame
        this._hits = hits;
    }
}
new App();