import { TransformNode, ShadowGenerator, Scene, Mesh, UniversalCamera, ArcRotateCamera, Vector3, Quaternion, Ray, ActionManager, ExecuteCodeAction, AnimationGroup } from "@babylonjs/core";
import { theFramework } from "./multiplayer";

export class Player extends TransformNode {
    public camera;
    public dialogueCamera;
    public scene: Scene;
    private _input;
    private _canvas: HTMLCanvasElement;

    //Multiplayer
    private socket = theFramework.socket;

    //Player
    public mesh: Mesh; //outer collisionbox of player

    //Camera
    private _camRoot: TransformNode;
    private _yTilt: TransformNode;

    //animations
    private _run: AnimationGroup;
    private _idle: AnimationGroup;
    private _jump: AnimationGroup;
    private _land: AnimationGroup;
    private _dash: AnimationGroup;

    // animation trackers
    private _currentAnim: AnimationGroup = null;
    private _prevAnim: AnimationGroup;
    private _isFalling: boolean = false;
    private _jumped: boolean = false;

    //const values
    private static readonly PLAYER_SPEED: number = 0.2;
    private static readonly JUMP_FORCE: number = 0.45;
    private static readonly GRAVITY: number = -1.8;
    private static readonly DASH_FACTOR: number = 2;
    private static readonly DASH_TIME: number = 10; //how many frames the dash lasts
    private static readonly DOWN_TILT: Vector3 = new Vector3(0.8290313946973066, 0, 0);
    private static readonly ORIGINAL_TILT: Vector3 = new Vector3(0.5934119456780721, 0, 0);
    public dashTime: number = 0;

    //player movement vars
    private _deltaTime: number = 0;
    private _h: number;
    private _v: number;

    private _moveDirection: Vector3 = new Vector3();
    private _inputAmt: number;

    //dashing
    private _dashPressed: boolean;
    private _canDash: boolean = true;

    //gravity, ground detection, jumping
    private _gravity: Vector3 = new Vector3();
    private _lastGroundPos: Vector3 = Vector3.Zero(); // keep track of the last grounded position
    private _grounded: boolean;
    private _jumpCount: number = 1;

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator, canvas: HTMLCanvasElement, input?) {
        super("player", scene);
        this._canvas = canvas;
        this.scene = scene;
        this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        this._idle = assets.animationGroups[1];
        this._run = assets.animationGroups[0];

        shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows

        this._setUpAnimations(); //Call the function to set up the animations

        this._input = input;
        console.log(this._input);

        //--COLLISIONS--
        this.mesh.actionManager = new ActionManager(this.scene);

        //if player falls through "world", reset the position to the last safe grounded position
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionEnterTrigger,
                parameter: this.scene.getMeshByName("ground")
            },
                () => {
                    this.mesh.position.copyFrom(this._lastGroundPos); // need to use copy or else they will be both pointing at the same thing & update together
                }
            )
        );
    }

    private _updateFromControls(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        this._moveDirection = Vector3.Zero(); // vector that holds movement information
        this._h = this._input.horizontal; //x-axis
        this._v = this._input.vertical; //z-axis

        //--DASHING--
        //limit dash to once per ground/platform touch
        if (this._input.dashing && !this._dashPressed && this._canDash) {
            this._canDash = false; //we've started a dash, do not allow another
            this._dashPressed = true; //start the dash sequence
        }

        let dashFactor = 1;
        //if you're dashing, scale movement
        if (this._dashPressed) {
            if (this.dashTime > Player.DASH_TIME) {
                this.dashTime = 0;
                this._dashPressed = false;
            } else {
                dashFactor = Player.DASH_FACTOR;
            }
            this.dashTime++;
        }

        //--MOVEMENTS BASED ON CAMERA (as it rotates)--
        let fwd = this._camRoot.forward;
        let right = this._camRoot.right;
        let correctedVertical = fwd.scaleInPlace(this._v);
        let correctedHorizontal = right.scaleInPlace(this._h);

        //movement based off of camera's view
        let move = correctedHorizontal.addInPlace(correctedVertical);

        //clear y so that the character doesnt fly up, normalize for next step, taking into account whether we've DASHED or not
        this._moveDirection = new Vector3((move).normalize().x * dashFactor, 0, (move).normalize().z * dashFactor);

        //clamp the input value so that diagonal movement isn't twice as fast
        let inputMag = Math.abs(this._h) + Math.abs(this._v);
        if (inputMag < 0) {
            this._inputAmt = 0;
        } else if (inputMag > 1) {
            this._inputAmt = 1;
        } else {
            this._inputAmt = inputMag;
        }

        //final movement that takes into consideration the inputs
        this._moveDirection = this._moveDirection.scaleInPlace(this._inputAmt * Player.PLAYER_SPEED);

        //Updating position to remote server
        this.socket.emit("playerMoving", this.mesh.position._x, this.mesh.position._y, this.mesh.position._z);

        //Rotations
        //check if there is movement to determine if rotation is needed
        let input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis); //along which axis is the direction
        if (input.length() == 0) {//if there's no input detected, prevent rotation and keep player in same rotation
            return;
        }
        //rotation based on input & the camera angle
        let angle = Math.atan2(this._input.horizontalAxis, this._input.verticalAxis);
        angle += this._camRoot.rotation.y;
        //mesh rotation
        let targ = Quaternion.FromEulerAngles(0, angle, 0);
        this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion, targ, 2 * this._deltaTime);
        //camera rotation
        this._camRoot.rotation = Vector3.Lerp(this._camRoot.rotation, new Vector3(this._camRoot.rotation.x, angle, this._camRoot.rotation.z), 2 * this._deltaTime);

    }


    private _setUpAnimations(): void {

        this.scene.stopAllAnimations();
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;

        //initialize current and previous
        this._currentAnim = this._idle;
        this._prevAnim = this._run;
    }

    private _animatePlayer(): void {
        if (!this._dashPressed && !this._isFalling && !this._jumped 
            && (this._input.vertical != 0
            || this._input.horizontal != 0)) {
            this._currentAnim = this._run;
        } else if (this._jumped && !this._isFalling && !this._dashPressed) {
            //this._currentAnim = this._jump;
        } else if (!this._isFalling && this._grounded) {
            this._currentAnim = this._idle;
            //only notify observer if it's playing
            /*if(this.scene.getSoundByName("walking").isPlaying){
                this.onRun.notifyObservers(false);
            }
        */} else if (this._isFalling) {
           // this._currentAnim = this._land;
        }

        //Animations
        if(this._currentAnim != null && this._prevAnim !== this._currentAnim){
            this._prevAnim.stop();
            this._currentAnim.play(this._currentAnim.loopAnimation);
            this._prevAnim = this._currentAnim;
        }
    }

    //--GROUND DETECTION--
    //Send raycast to the floor to detect if there are any hits with meshes below the character
    private _floorRaycast(offsetx: number, offsetz: number, raycastlen: number): Vector3 {
        //position the raycast from bottom center of mesh 
        let raycastFloorPos = new Vector3(this.mesh.position.x + offsetx, this.mesh.position.y + 0.5, this.mesh.position.z + offsetz);
        let ray = new Ray(raycastFloorPos, Vector3.Up().scale(-1), raycastlen);

        //defined which type of meshes should be pickable 
        let predicate = function (mesh) {
            return mesh.isPickable && mesh.isEnabled();
        }

        let pick = this.scene.pickWithRay(ray, predicate);

        if (pick.hit) { //grounded
            return pick.pickedPoint;
        } else { //not grounded
            return Vector3.Zero();
        }
    }

    //raycast from the center of the player to check for whether player is grounded
    private _isGrounded(): boolean {
        if (this._floorRaycast(0, 0, 0.6).equals(Vector3.Zero())) {
            return false;
        } else {
            return true;
        }
    }

    //check whether a mesh is sloping based on the normal
    private _checkSlope(): boolean {

        //only check meshes that are pickable and enabled (specific for collision meshes that are invisible)
        let predicate = function (mesh) {
            return mesh.isPickable && mesh.isEnabled();
        }

        //4 raycasts outward from center
        let raycast = new Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z + .25);
        let ray = new Ray(raycast, Vector3.Up().scale(-1), 1.5);
        let pick = this.scene.pickWithRay(ray, predicate);

        let raycast2 = new Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z - .25);
        let ray2 = new Ray(raycast2, Vector3.Up().scale(-1), 1.5);
        let pick2 = this.scene.pickWithRay(ray2, predicate);

        let raycast3 = new Vector3(this.mesh.position.x + .25, this.mesh.position.y + 0.5, this.mesh.position.z);
        let ray3 = new Ray(raycast3, Vector3.Up().scale(-1), 1.5);
        let pick3 = this.scene.pickWithRay(ray3, predicate);

        let raycast4 = new Vector3(this.mesh.position.x - .25, this.mesh.position.y + 0.5, this.mesh.position.z);
        let ray4 = new Ray(raycast4, Vector3.Up().scale(-1), 1.5);
        let pick4 = this.scene.pickWithRay(ray4, predicate);

        if (pick.hit && !pick.getNormal().equals(Vector3.Up())) {
            if (pick.pickedMesh.name.includes("stair")) {
                return true;
            }
        } else if (pick2.hit && !pick2.getNormal().equals(Vector3.Up())) {
            if (pick2.pickedMesh.name.includes("stair")) {
                return true;
            }
        }
        else if (pick3.hit && !pick3.getNormal().equals(Vector3.Up())) {
            if (pick3.pickedMesh.name.includes("stair")) {
                return true;
            }
        }
        else if (pick4.hit && !pick4.getNormal().equals(Vector3.Up())) {
            if (pick4.pickedMesh.name.includes("stair")) {
                return true;
            }
        }
        return false;
    }

    private _updateGroundDetection(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        //if not grounded
        if (!this._isGrounded()) {
            //if the body isnt grounded, check if it's on a slope and was either falling or walking onto it
            if (this._checkSlope() && this._gravity.y <= 0) {
                console.log("slope")
                //if you are considered on a slope, you're able to jump and gravity wont affect you
                this._gravity.y = 0;
                this._jumpCount = 1;
                this._grounded = true;
            } else {
                //keep applying gravity
                this._gravity = this._gravity.addInPlace(Vector3.Up().scale(this._deltaTime * Player.GRAVITY));
                this._grounded = false;
            }
        }

        //limit the speed of gravity to the negative of the jump power
        if (this._gravity.y < -Player.JUMP_FORCE * 2) {
            this._gravity.y = -Player.JUMP_FORCE * 2;
        }

        //cue falling animation once gravity starts pushing down
        if (this._gravity.y < 0 && this._jumped) { //todo: play a falling anim if not grounded BUT not on a slope
            this._isFalling = true;
        }

        //update our movement to account for jumping
        this.mesh.moveWithCollisions(this._moveDirection.addInPlace(this._gravity));

        if (this._isGrounded()) {
            this._gravity.y = 0;
            this._grounded = true;
            //keep track of last known ground position
            this._lastGroundPos.copyFrom(this.mesh.position);

            this._jumpCount = 1;
            //dashing reset
            this._canDash = true;
            //reset sequence(needed if we collide with the ground BEFORE actually completing the dash duration)
            this.dashTime = 0;
            this._dashPressed = false;

            //jump & falling animation flags
            this._jumped = false;
            this._isFalling = false;
        }

        //Jump detection
        if (this._input.jumpKeyDown && this._jumpCount > 0) {
            this._gravity.y = Player.JUMP_FORCE;
            this._jumpCount--;

            //jumping and falling animation flags
            this._jumped = true;
            this._isFalling = false;
        }

    }

    private _beforeRenderUpdate(): void {
        this._updateFromControls();
        this._updateGroundDetection();
        this._animatePlayer();
    }

    public activatePlayerCamera(): UniversalCamera {
        this.scene.registerBeforeRender(() => {

            this._beforeRenderUpdate();
            this._updateCamera();

        });
        return this.camera;
    }

    private _updateCamera(): void {
        let centerPlayer = this.mesh.position.y + 2;
        if(this.scene.getTransformNodeById('convOpen')) {
            if(this.scene.getTransformNodeById('convOpen').isEnabled()){
                this._camRoot.position = Vector3.Lerp(this._camRoot.position, new Vector3(this.mesh.position.x, centerPlayer, this.mesh.position.z), 0.4);
            }
        }

        if(this.camera.radius < 1) {
            this.mesh.setEnabled(false);
        } else {
            this.mesh.setEnabled(true);
        }
    }

    private _setupPlayerCamera() {
        //root camera parent that handles positioning of the camera to follow the player
        this._camRoot = new TransformNode("root");
        this._camRoot.position = new Vector3(0, 0, 0); //initialized at (0,0,0)
        //to face the player from behind (180 degrees)
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);

        //rotations along the x-axis (up/down tilting)
        let yTilt = new TransformNode("ytilt");
        //adjustments to camera view to point down at our player
        yTilt.rotation = Player.ORIGINAL_TILT;
        this._yTilt = yTilt;
        yTilt.parent = this._camRoot;

        //our default camera that's pointing at our root's position
        this.camera = new ArcRotateCamera("cam", Math.PI * 1.5, Math.PI / 2, 10, this._camRoot.position, this.scene);
        this.camera.attachControl(this._canvas, true);

        //Set camera limits
        this.camera.lowerRadiusLimit = 0;
        this.camera.upperRadiusLimit = 100;
        this.camera.lowerBetaLimit = Math.PI / 4;
        this.camera.upperBetaLimit = Math.PI / 1.5;
        this.camera.lowerAlphaLimit = Math.PI * 1.5;
        this.camera.upperAlphaLimit = Math.PI * 1.5;

        //Apply Collisions -- THE COLLISION CHECK WORKS BUT IT DOESN'T STOP THE CAMERA --
        this.camera.applyGravity = true;
        this.camera.ellipsoid = new Vector3(1, 1, 1);
        this.camera.checkCollisions = true;

        //Effect on collide
        this.camera.onCollide = function (collidedMesh) {
            //console.log(collidedMesh);
        }
        
        this.camera.inputs.remove(this.camera.inputs.attached.keyboard); //Remove keyboard controls 
        this.camera.parent = yTilt; //Parent to yTilt

≈        return this.camera;
    }
}