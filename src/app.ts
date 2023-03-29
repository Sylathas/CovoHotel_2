import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

import { Engine, Scene, Vector3, Mesh, MeshBuilder, FreeCamera, Color4, StandardMaterial, Color3, PointLight, ShadowGenerator, Quaternion, Matrix, SceneLoader, GlowLayer, HDRCubeTexture, Texture, PointerEventTypes, Ray, Animation, PickingInfo, AnimationGroup, TransformNode, Sound, SceneOptimizerOptions, HardwareScalingOptimization, SceneOptimizer, LensFlaresOptimization, TextureOptimization, DirectionalLight} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, Container } from "@babylonjs/gui";
import { Environment } from "./environment";
import { Player } from "./characterController";
import { PlayerInput } from "./inputController";
import { NPC } from "./NPC";
import { InteractObject } from "./interactObject";
import { theFramework } from "./multiplayer"
import { io, Socket } from "socket.io-client";

enum State { START = 0, GAME = 1, LOADING = 2, DREAM = 3 }

//Dictionary Types
type NPCAssets = {
   mesh: Mesh;
   animationGroups: AnimationGroup;
   name: string;
}

class App {

    //General Entire Application
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    //Game State Related
    public assets;
    public otherAssets : { [name: string]: NPCAssets } = {};
    private _input: PlayerInput;
    private _environment;
    private _player: Player;
    private _npc: NPC[] = [];
    private _interactObject: InteractObject[] = [];
    private _environmentTexture: string = "textures/env.hdr"; //environment texture for HDRI and skybox
    private _playerModel: string = "player_animated.glb"; //mesh of the player
    private _otherModels: string[] = ["player_animated.glb"]; //mesh of npcs and interactive objects
    public _convOpen: boolean = false;
    private _goGame: boolean = false;

    //Dream State Related
    private _dreamInput: PlayerInput;
    private _dreamEnvironment;
    private _dreamPlayer: Player;
    private _dreamEnvironmentTexture: string = "textures/sky.hdr"; //environment texture for HDRI and skybox
    private _goDream: boolean;

    //Scene - related
    private _state: number = 0;
    private _gamescene: Scene;
    private _dreamscene: Scene;
    private _cutScene: Scene;

    //Camera related
    private shadowGenerator;
    private dreamShadowGenerator;
    private _mouseDown: boolean = false;

    //Camera Raycasting
    private _hits: PickingInfo[] = [];
    private _fadeAnimation: Animation;

     //Multiplayer
    private socket = theFramework.socket;
    private users = {};
    private playersIndex = 3;

    //Tools for optimizing
    private _optimizer: SceneOptimizer;
    private isOptimized: boolean = false;
    private _optimizationLevel: number = 0;

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
                case State.DREAM:
                    this._scene.render();
                    break;
                case State.GAME:
                    this._scene.render();
                    break;
                case State.LOADING:
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
        const environment = new Environment(scene, "Layout.glb");
        this._environment = environment;
        await this._environment.load(); //environment
        await this._loadCharacterAssets(scene, this._playerModel);
        await this._loadOtherAssets(scene, this._otherModels);
    }

    private async _initializeGameAsync(scene): Promise<void> {
        scene.ambientColor = new Color3(0, 0, 0);
        scene.clearColor = new Color4(0, 0, 0);

        const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
        light.diffuse = new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825);
        light.intensity = 35;
        light.radius = 1;

        this.shadowGenerator = new ShadowGenerator(1024, light);
        this.shadowGenerator.darkness = 0.4;

        //Create a Node that is used to check for the convOpen
        new TransformNode('convOpen', scene);

        //Create the player
        this._player = new Player(this.assets, scene, this.shadowGenerator, this._canvas, this._input);
        const camera = this._player.activatePlayerCamera();

        //Create NPCs
        console.log(this._otherModels);
        this._npc.push(new NPC(this._otherModels['player_animated.glb'], scene, this.shadowGenerator, new Vector3(10,2,10), 'npc1', camera, this._canvas));
        this._npc.push(new NPC(this._otherModels['player_animated.glb'], scene, this.shadowGenerator, new Vector3(10,2,20), 'npc2', camera, this._canvas));

        this._interactObject.push(new InteractObject(this._otherModels['player_animated.glb'], scene, this.shadowGenerator, new Vector3(10,2,20), 'npc2'));

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

        //Add interactions for buttons
        document.getElementById("dance").onclick = function(){
        };

        document.getElementById("settings").onclick = function(){
        };

        document.getElementById("covo").onclick = function(){
            window.open('https://www.instagram.com/covo.world/', "_blank");
        };

        //dont detect any inputs from this ui while the game is loading
        scene.detachControl();

        //IBL (image based lighting) - to give scene an ambient light
        const envHdri = new HDRCubeTexture(this._environmentTexture, scene, 512);
        envHdri.name = "env";
        envHdri.gammaSpace = false;
        scene.environmentTexture = envHdri;
        scene.environmentIntensity = 0.01;

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

        //Add UI to the scene
        document.getElementById('UI').style.display = 'block';

        //Add fade animation to all the meshes in the scene
        this._scene.meshes.forEach(mesh => {
            mesh.animations.push(this._fadeAnimation);
            this._npc.forEach(npc => {
                if(mesh.name === npc.name){
                    mesh.animations.pop();
                }
            });
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
                    if (this._mouseDown && this._scene.getTransformNodeById('convOpen').isEnabled()) {
                        this._scene.cameras[0]._cache.parent.rotation.y += (this._scene.pointerX - lastMousePos) / 100;
                    }
                    lastMousePos = this._scene.pointerX;
                    break;
            }
        });

        this._scene.registerBeforeRender(() => {
            // Make meshes between player and camera turn transparent
            this._checkFrontCamera();

            //Optimize automatically scene based on the framerate
            if(this._engine.getFps() < 15 && this._optimizationLevel < 3) {
                this._optimizeScene(scene, SceneOptimizerOptions.HighDegradationAllowed(60), 5);
                this._optimizationLevel = 3;
            } else if(this._engine.getFps() < 30 && this._optimizationLevel < 2) {
                this._optimizeScene(scene, SceneOptimizerOptions.ModerateDegradationAllowed(60), 3);
                this._optimizationLevel = 2;
            } else if(this._engine.getFps() < 60 && this._optimizationLevel < 1) {
                this._optimizeScene(scene, SceneOptimizerOptions.LowDegradationAllowed(60), 2);
                this._optimizationLevel = 1;
            } else if(this._engine.getFps() > 120 && this.isOptimized){
                this._optimizer.stop();
                this._optimizer.reset();
            }
        });

        this._scene.registerAfterRender(() => {
            //Enter dream when passing through the trigger 
            if(this._player.mesh) {
                if (this._player.mesh.intersectsMesh(this._scene.getMeshByName("dream")) && !this._goDream ) {
                    this._goDream = true;
                    this._gamescene = this._scene;
                    if(this._dreamPlayer) {
                        this._scene = this._dreamscene;
                        this._state = State.DREAM;
                        return
                    }
                    this._goToDream();
                }
            }
        });

        //Multiplayer

        //Initialize
        this.socket.on('initialize', (startingTime, players) => {
            console.log("Starting Time: " + startingTime);
            console.log("Connected Players: " + players);
        });

        //Create Other Users
        this.socket.on('newPlayer', (remoteSocketId) => {
            console.log("A new player joined with id: " + remoteSocketId);
            this.playersIndex = this.playersIndex + 1;
            this.users[remoteSocketId] = new NPC(this._otherModels['player_animated.glb'], scene, this.shadowGenerator, new Vector3(this._scene.getMeshByName('outer').position.x, this._scene.getMeshByName('outer').position.y + 0.5, this._scene.getMeshByName('outer').position.z), "player.glb", this._scene.cameras[0], this._canvas);
            console.log(this.users);
        });
        
        //Manage Other Users Movement
        this.socket.on('playerMoved', (remoteSocketId, posX, posY, posZ) => {
            if (this.users[remoteSocketId] == null) {
                this.users[remoteSocketId] = new NPC(this._otherModels['player_animated.glb'], scene, this.shadowGenerator, new Vector3(posX, posY, posZ), "player.glb", this._scene.cameras[0], this._canvas);
            } else { this.users[remoteSocketId].mesh.position = new Vector3(posX, posY, posZ);}
        });

        //Delete disconnected player
        this.socket.on('deletePlayer', (arg) => {
            console.log("Player " + arg + " just disconnected from the server");
            this.users[arg].mesh.dispose();
            delete this.users[arg];
        });

        //Manage Sounds
        const music = new Sound("music", "/sounds/kobra.mp3", scene, null,
          {
            autoplay: true, 
            loop: true,
            spatialSound: true,
          });

        //--START LOADING AND SETTING UP THE DREAM DURING THIS SCENE--
        var finishedLoading = false;
        await this._setUpDream().then(res => {
            finishedLoading = true;
            console.log('caricato');
        });
    }

    private async _setUpDream() {
        let scene = new Scene(this._engine);
        this._dreamscene = scene;

        //--CREATE ENVIRONMENT--
        const environment = new Environment(scene, "Dream.gltf");
        this._dreamEnvironment = environment;
        await this._dreamEnvironment.load(); //environment
        await this._loadCharacterAssets(scene, this._playerModel);
    }

    private async _initializeDreamAsync(scene): Promise<void> {
        scene.ambientColor = new Color3(0, 0, 0);
        scene.clearColor = new Color4(0, 0, 0);

        const light = new DirectionalLight("sun", new Vector3(-0.5, -0.5, -0.5), scene);
        light.position = new Vector3(50, 50, 50);
        light.diffuse = new Color3(0.91, 0.83, 0.52);
        light.intensity = 1;

        //Create a Node that is used to check for the convOpen
        new TransformNode('convOpen', scene);

        this.dreamShadowGenerator = new ShadowGenerator(1024, light);
        this.dreamShadowGenerator.darkness = 0.4;
        this.dreamShadowGenerator.useBlurExponentialShadowMap = true;

        //Create the player
        this._dreamPlayer = new Player(this.assets, scene, this.dreamShadowGenerator, this._canvas, this._dreamInput);
        const camera = this._dreamPlayer.activatePlayerCamera();

        //glow layer
        const gl = new GlowLayer("glow", scene);
        gl.intensity = 0.4;
        //webpack served from public
    }

    private async _goToDream() {
        //--SETUP SCENE--
        this._dreamscene.detachControl();
        let scene = this._dreamscene;
        scene.pointerMovePredicate = () => false;
        scene.pointerDownPredicate = () => false;
        scene.pointerUpPredicate = () => false;
        scene.clearColor = new Color4(0.01568627450980392, 0.01568627450980392, 0.20392156862745098); // a color that fit the overall color scheme better

        //Add interactions for buttons
        document.getElementById("dance").onclick = function(){
        };

        document.getElementById("settings").onclick = function(){
        };

        document.getElementById("covo").onclick = function(){
            window.open('https://www.instagram.com/covo.world/', "_blank");
        };

        //dont detect any inputs from this ui while the game is loading
        scene.detachControl();

        
        //IBL (image based lighting) - to give scene an ambient light
        const envHdri = new HDRCubeTexture(this._dreamEnvironmentTexture, scene, 512);
        envHdri.name = "env";
        envHdri.gammaSpace = false;
        /*
        scene.environmentTexture = envHdri;
        scene.environmentIntensity = 0.1;
        */

        // Skybox
	    var skybox = MeshBuilder.CreateSphere("skyBox", {diameter:1000.0}, scene);
	    var skyboxMaterial = new StandardMaterial("skyBox", scene);
	    skyboxMaterial.backFaceCulling = false;
	    skyboxMaterial.reflectionTexture = envHdri;
	    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
	    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
	    skyboxMaterial.specularColor = new Color3(0, 0, 0);
	    skybox.material = skyboxMaterial;	

        scene.autoClear = false; // Color buffer
        scene.autoClearDepthAndStencil = false; // Depth and stencil, obviously

        //--INPUT--
        this._dreamInput = new PlayerInput(scene, this._canvas); //detect keyboard/mobile inputs
        console.log(this._dreamInput);

        //primitive character and setting
        await this._initializeDreamAsync(scene);

        //--WHEN SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        scene.getMeshByName("outer").position = scene.getTransformNodeByName("startPosition").getAbsolutePosition(); //move the player to the start position
        //get rid of start scene, switch to gamescene and change states
        this._scene = scene;
        this._state = State.DREAM;
        this._scene.gravity = new Vector3(0, -0.15, 0);
        this._engine.hideLoadingUI();
        //the game is ready, attach control back
        this._scene.attachControl();

        //Add UI to the scene
        document.getElementById('UI').style.display = 'block';

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

            //Optimize automatically scene based on the framerate
            if(this._engine.getFps() < 15 && this._optimizationLevel < 3) {
                this._optimizeScene(scene, SceneOptimizerOptions.HighDegradationAllowed(60), 5);
                this._optimizationLevel = 3;
            } else if(this._engine.getFps() < 30 && this._optimizationLevel < 2) {
                this._optimizeScene(scene, SceneOptimizerOptions.ModerateDegradationAllowed(60), 3);
                this._optimizationLevel = 2;
            } else if(this._engine.getFps() < 60 && this._optimizationLevel < 1) {
                this._optimizeScene(scene, SceneOptimizerOptions.LowDegradationAllowed(60), 2);
                this._optimizationLevel = 1;
            } else if(this._engine.getFps() > 120 && this.isOptimized){
                this._optimizer.stop();
                this._optimizer.reset();
            }
        });

        this._scene.registerAfterRender(() => {

            //Get back to game when passing through the trigger 
            if(this._dreamPlayer.mesh) {
                if (this._dreamPlayer.mesh.intersectsMesh(this._scene.getMeshByName("SHRINE"))) {
                    this._dreamscene.getMeshByName("outer").position = Vector3.Zero();
                    this._gamescene.getMeshByName('outer').position.z = this._gamescene.getMeshByName('outer').position.z - 15;
                    this._scene = this._gamescene;
                    this._state = State.GAME;
                    this._goDream = false;
                }
            }
        });
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
                root.isPickable = false;
                //body is our actual player mesh
                const body = root;
                body.parent = outer;
                body.isPickable = false; //so our raycasts dont hit ourself
                body.getChildMeshes().forEach(m => {
                    m.isPickable = false;
                })

                return {
                    mesh: outer as Mesh,
                    animationGroups: result.animationGroups
                }
            });
        }
        return loadCharacter(playerModel).then(assets => {
            this.assets = assets;
        })

    }

    private async _loadOtherAssets(scene, otherModels) {

        async function loadOtherModels(model) {
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
                });

                return {
                    mesh: outer as Mesh,
                    animationGroups: result.animationGroups,
                    name: model
                }
            });
        }

        otherModels.forEach((model) => {
            return loadOtherModels(model).then(assets => {
                otherModels[assets.name] = { mesh: assets.mesh, animationGroups: assets.animationGroups, name: assets.name}
            });
        });
    }

    private _optimizeScene(scene, degradation, hardwareOptimization) {
        let game = this;
        SceneOptimizer.OptimizeAsync(scene, degradation,
            function() {
            var options = new SceneOptimizerOptions(60, 500);
            options.addOptimization(new HardwareScalingOptimization(0, hardwareOptimization));
            options.addOptimization(new TextureOptimization(0, 1));
  
            // Optimizer
            if(game.isOptimized) {
                game._optimizer.stop();
                game._optimizer.reset();
            }
            game._optimizer = new SceneOptimizer(scene, options);
            game._optimizer.start();
            game.isOptimized = true;
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