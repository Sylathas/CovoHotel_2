import { Scene, ActionManager, ExecuteCodeAction, Scalar } from "@babylonjs/core";

export class PlayerInput {
    public inputMap: any;

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
    public mobileLeft: boolean;
    public mobileRight: boolean;
    public mobileUp: boolean;
    public mobileDown: boolean;
    private _mobileJump: boolean;
    private _mobileDash: boolean;

    constructor(scene: Scene) {
        //scene action manager to detect inputs
        scene.actionManager = new ActionManager(scene);

        this.inputMap = {};
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));

        //add to the scene an observable that calls updateFromKeyboard before rendering
        scene.onBeforeRenderObservable.add(() => {
            this._updateFromKeyboard();
        });
    }

    private _updateFromKeyboard(): void {
        if (this.inputMap["ArrowUp"] || this.inputMap["w"] || this.inputMap["W"] || this.mobileUp) {
            this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);
        } else if (this.inputMap["ArrowDown"] || this.inputMap["s"] || this.inputMap["S"] || this.mobileDown) {
            this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
        } else {
            this.vertical = 0;
            this.verticalAxis = 0;
        }

        if (this.inputMap["ArrowLeft"] || this.inputMap["a"] || this.inputMap["A"] || this.mobileLeft) {
            this.horizontalAxis = -1;

        } else if (this.inputMap["ArrowRight"] || this.inputMap["d"] || this.inputMap["D"] || this.mobileRight) {
            this.horizontalAxis = 1;
        } else if (this.inputMap["q"] || this.inputMap["Q"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);

        } else if (this.inputMap["e"] || this.inputMap["E"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
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
}