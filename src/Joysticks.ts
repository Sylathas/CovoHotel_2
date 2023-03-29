import { VirtualJoystick, Vector4 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, Ellipse } from "@babylonjs/gui";

export class Joysticks {

    public _canvas: HTMLCanvasElement;
    public _posX;
    public _posY;
    public _oldPosY;
    public _oldPosX;

    constructor(canvas: HTMLCanvasElement, scene) {
        this._canvas = canvas;
        this._posX = 0;
        this._posY = 0;

        let game = this;

        //Create UI element as body of controller
        let adt = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        let bottomJoystickOffset = -150;

        //Define the Movement Controller
        let leftThumbContainer = this.makeThumbArea("leftThumb", 2, "white", null);
        leftThumbContainer.height = "500px";
        leftThumbContainer.width = "500px";
        leftThumbContainer.isPointerBlocker = true;
        leftThumbContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        leftThumbContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        leftThumbContainer.alpha = 0;

        //Define the Movement Controller's puck
        let leftPuck = this.makeThumbArea("leftPuck", 0, "white", "white");
        leftPuck.height = "100px";
        leftPuck.width = "100px";
        leftPuck.isPointerBlocker = true;
        leftPuck.isHitTestVisible = false;
        leftPuck.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftPuck.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        canvas.addEventListener('touchstart', () => {
            leftThumbContainer.top = scene.pointerY - 250;
            leftThumbContainer.left = scene.pointerX - 250;
            leftPuck.isVisible = true;
            leftThumbContainer.alpha = 1;
            game._oldPosX = scene.pointerX;
            game._oldPosY = scene.pointerY;
        });

        canvas.addEventListener('touchend', () => {
            leftPuck.isVisible = false;
            leftThumbContainer.alpha = 0;
            game._posX = 0;
            game._posY = 0;
            leftPuck.left = game._posX;
            leftPuck.top = game._posY;
        });

        canvas.addEventListener('touchmove', () => {
            if (leftPuck.isVisible) {
                game._posX = scene.pointerX - game._oldPosX;
                game._posY = scene.pointerY - game._oldPosY;
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
