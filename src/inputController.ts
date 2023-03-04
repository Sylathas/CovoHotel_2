import { Scene, ActionManager, ExecuteCodeAction, Scalar, Vector3, Space } from "@babylonjs/core";
import { Joysticks } from "./Joysticks"

export class PlayerInput {
    public inputMap: any;
    private _canvas: HTMLCanvasElement;
    private _deltaTime;

    //simple movement
    public horizontal: number = 0;
    public vertical: number = 0;
    //tracks whether or not there is movement in that axis
    public horizontalAxis: number = 0;
    public verticalAxis: number = 0;

    //jumping and dashing
    public jumpKeyDown: boolean = false;
    public dashing: boolean = false;

    //Mobile Input trackers
    public joystickPos: Joysticks;

    constructor(scene: Scene, canvas: HTMLCanvasElement) {
        //scene action manager to detect inputs
        scene.actionManager = new ActionManager(scene);

        this._canvas = canvas;

        //joystick controller on mobile
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this.joystickPos = new Joysticks(this._canvas, scene);
        }

        this.inputMap = {};
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));

        //add to the scene an observable that calls updateFromKeyboard or updateFromController and update before rendering
        scene.onBeforeRenderObservable.add(() => {
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                if(scene.getTransformNodeById('convOpen').isEnabled()){
                    this._updateFromController(scene);
                }

            } else {
                if(scene.getTransformNodeById('convOpen').isEnabled()){
                    this._updateFromKeyboard(scene);
                }
            }
        });
    }

    private _updateFromController(scene): void {
        if ( this.joystickPos._posY < -50) {
            this.vertical = Scalar.Lerp(this.vertical, 1, 0.5);
            this._rotateCamera(scene);
        } else if (this.joystickPos._posY > 50) {
            this.vertical = Scalar.Lerp(this.vertical, -1, 0.5);
            this._rotateCamera(scene);
        } else {
            this.vertical = 0;
            this.verticalAxis = 0;
        }

        if (this.joystickPos._posX < -50) {
            this.horizontalAxis = -1;
            this._rotateCamera(scene);
        } else if (this.joystickPos._posX > 50) {
            this.horizontalAxis = 1;
            this._rotateCamera(scene);
        } else {
            this.horizontal = 0;
            this.horizontalAxis = 0;
        }
    }

    private _updateFromKeyboard(scene): void {
        if (this.inputMap["ArrowUp"] || this.inputMap["w"] || this.inputMap["W"]) {
            this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);
            this._rotateCamera(scene);
        } else if (this.inputMap["ArrowDown"] || this.inputMap["s"] || this.inputMap["S"]) {
            this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
            this._rotateCamera(scene);
        } else {
            this.vertical = 0;
            this.verticalAxis = 0;
        }

        if (this.inputMap["ArrowLeft"] || this.inputMap["a"] || this.inputMap["A"]) {
            this.horizontalAxis = -1;
            this._rotateCamera(scene);
        } else if (this.inputMap["ArrowRight"] || this.inputMap["d"] || this.inputMap["D"]) {
            this.horizontalAxis = 1;
            this._rotateCamera(scene);
        } else if (this.inputMap["q"] || this.inputMap["Q"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);
            this._rotateCamera(scene);
        } else if (this.inputMap["e"] || this.inputMap["E"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
            this._rotateCamera(scene);
        }
        else {
            this.horizontal = 0;
            this.horizontalAxis = 0;
        }

        //dash
        if (this.inputMap["Shift"]) {
            this.dashing = true;
        } else {
            this.dashing = false;
        }

        //Jump Checks (SPACE)
        if (this.inputMap[" "]) {
            this.jumpKeyDown = true;
        } else {
            this.jumpKeyDown = false;
        }
    }

    private _rotateCamera(scene): void {
        scene.cameras[0]._cache.parent._cache.parent.rotation.y += scene.cameras[0]._cache.parent.rotation.y;
        scene.getNodeById("outer").rotate(new Vector3(0, 1, 0), scene.cameras[0]._cache.parent.rotation.y, Space.WORLD);
        scene.cameras[0]._cache.parent.rotation.y = 0;
    }
}