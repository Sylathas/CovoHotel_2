import { TransformNode, ShadowGenerator, Scene, Vector3, PointerEventTypes, AbstractMesh, AnimationGroup, ArcRotateCamera, Scalar, LensRenderingPipeline, DefaultRenderingPipeline } from "@babylonjs/core";
import { AdvancedDynamicTexture, Container, StackPanel, Control, TextBlock } from "@babylonjs/gui";

import { uiElement } from "./uiElement";
import { convsMale } from "./dialogues";

export class OtherPlayer extends TransformNode {
    private scene: Scene;

    //Animation
    private _idle: AnimationGroup;

    //Player 
    private mesh: AbstractMesh; //outer collisionbox of Player

    constructor(assets ,scene: Scene, shadowGenerator: ShadowGenerator[], position: Vector3, name: string) {
        super(name, scene);
        this.scene = scene;

        //Initialize the Player 
        const copyMesh = this.scene.getMeshByName(assets.name);
        this.mesh = copyMesh.clone(name, this);
        this.mesh.position = position;
        this.mesh.isEnabled(false);

        //animate NPC with animation
        this._idle = assets.animationGroups[1];
        this.scene.stopAllAnimations();
        this._idle.loopAnimation = true;

        shadowGenerator.forEach(element => {
            element.addShadowCaster(this.mesh); //the player mesh will cast shadows
        });
        

        this.scene.registerBeforeRender(() => {
            this._animatePlayer();
        });
    }

    private _animatePlayer(): void {
        this._idle.play(this._idle.loopAnimation);
    }
}
