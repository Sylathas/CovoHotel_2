import { AdvancedDynamicTexture, Button, Control, Image } from "@babylonjs/gui";

export function uiElement (name, imgUrl, width, height, button: boolean, left?: string, paddingBottom?: string, alignmentVert?: number, alignmentHor?: number){
    var element = new Image(name, imgUrl);
    element.width = width;
    element.height = height;
    element.left = left || 0;
    element.paddingBottom = paddingBottom || 0;
    element.verticalAlignment = alignmentVert || 2;
    element.horizontalAlignment = alignmentHor || Control.HORIZONTAL_ALIGNMENT_LEFT;

    if(button) {
        element.isPointerBlocker = true;
        element.onPointerDownObservable.add(function () {
            console.log('ciao1');
            element.scaleX = .9;
            element.scaleY = .9;
        });
        element.onPointerUpObservable.add(function () {
            element.scaleX = 1;
            element.scaleY = 1;
        });
    }

    return element;
}