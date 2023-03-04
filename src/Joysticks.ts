import { VirtualJoystick, Vector4 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, Ellipse } from "@babylonjs/gui";

export class Joysticks {

    public _canvas: HTMLCanvasElement;
    public _posX;
    public _posY;
    //Control to see in which axis is the controller in
    private _posController: Vector4 = Vector4.Zero();

    constructor(canvas: HTMLCanvasElement, scene) {
        this._canvas = canvas;
        this._posX = 0;
        this._posY = 0;

        let game = this;

        //Create UI element as body of controller
        let adt = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        let bottomJoystickOffset = -150;

        //Define the Movement Controller
        let leftThumbContainer = this.makeThumbArea("leftThumb", 2, "blue", null);
        leftThumbContainer.height = "500px";
        leftThumbContainer.width = "500px";
        leftThumbContainer.isPointerBlocker = true;
        leftThumbContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftThumbContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        leftThumbContainer.alpha = 0.4;
        leftThumbContainer.top = bottomJoystickOffset;

        //Define the Movement Controller's puck
        let leftPuck = this.makeThumbArea("leftPuck", 0, "blue", "blue");
        leftPuck.height = "100px";
        leftPuck.width = "100px";
        leftPuck.isPointerBlocker = true;
        leftPuck.isHitTestVisible = false;
        leftPuck.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftPuck.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        leftThumbContainer.onPointerDownObservable.add(function (coordinates) {
            leftPuck.isVisible = true;
            leftThumbContainer.alpha = 1;
        });

        leftThumbContainer.onPointerUpObservable.add(function (coordinates) {
            leftPuck.isVisible = false;
            leftThumbContainer.alpha = 0.4;
            game._posX = 0;
            game._posY = 0;
        });

        leftThumbContainer.onPointerMoveObservable.add(function (coordinates) {
            if (leftPuck.isVisible) {
                game._posX = scene.pointerX - canvas.width / 2;
                game._posY = scene.pointerY - canvas.height + 450;
                leftPuck.left = game._posX;
                leftPuck.top = game._posY;
            }
        });

        adt.addControl(leftThumbContainer);
        leftThumbContainer.addControl(leftPuck);
        leftPuck.isVisible = false;
    }

    private makeThumbArea(name, thickness, color, background) {
        let rect = new Ellipse();
        rect.name = name;
        rect.thickness = thickness;
        rect.color = color;
        rect.background = background;
        rect.paddingLeft = "0px";
        rect.paddingRight = "0px";
        rect.paddingTop = "0px";
        rect.paddingBottom = "0px";

        return rect;
    }
}
