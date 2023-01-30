import { VirtualJoystick, Vector4 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, Ellipse } from "@babylonjs/gui";

export class Joysticks {

    private _posController: Vector4 = Vector4.Zero();
    public _canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        let adt = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        let bottomJoystickOffset = -50;
        let translateTransform;

        this._canvas = canvas;

        let leftThumbContainer = this.makeThumbArea("leftThumb", 2, "blue", null);
        leftThumbContainer.height = "200px";
        leftThumbContainer.width = "200px";
        leftThumbContainer.isPointerBlocker = true;
        leftThumbContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftThumbContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        leftThumbContainer.alpha = 1;
        leftThumbContainer.top = bottomJoystickOffset;

        let leftInnerThumbContainer = this.makeThumbArea("leftInnterThumb", 4, "blue", null);
        leftInnerThumbContainer.height = "80px";
        leftInnerThumbContainer.width = "80px";
        leftInnerThumbContainer.isPointerBlocker = true;
        leftInnerThumbContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftInnerThumbContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;


        let leftPuck = this.makeThumbArea("leftPuck", 0, "blue", "blue");
        leftPuck.height = "60px";
        leftPuck.width = "60px";
        leftPuck.isPointerBlocker = true;
        leftPuck.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftPuck.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        adt.addControl(leftThumbContainer);
        leftThumbContainer.addControl(leftInnerThumbContainer);
        leftThumbContainer.addControl(leftPuck);
        leftPuck.isVisible = true;
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
