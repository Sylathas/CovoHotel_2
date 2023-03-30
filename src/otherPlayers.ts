import { TransformNode, ShadowGenerator, Scene, Vector3, PointerEventTypes, AbstractMesh, AnimationGroup, ArcRotateCamera, Scalar, LensRenderingPipeline, DefaultRenderingPipeline } from "@babylonjs/core";
import { AdvancedDynamicTexture, Container, StackPanel, Control, TextBlock } from "@babylonjs/gui";

import { uiElement } from "./uiElement";
import { convsMale } from "./dialogues";

export class OtherPlayer extends TransformNode {
    private scene: Scene;

    //animations
    private _run: AnimationGroup;
    private _idle: AnimationGroup;
    private _jump: AnimationGroup;
    private _land: AnimationGroup;
    private _dance: AnimationGroup;
    public _isDancing: boolean;

    //Player 
    private mesh: AbstractMesh; //outer collisionbox of Player

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator[], position: Vector3, name: string) {
        super(name, scene);
        this.scene = scene;

        //Initialize the Player 
        const copyMesh = this.scene.getMeshByName(name);
        this.mesh = copyMesh.clone(name, this);
        this.mesh.position = position;
        this.mesh.isEnabled(false);
        this.mesh.isPickable = false;

        //animate NPC with animation
        //this._idle = assets.animationGroups[1];
        //this.scene.stopAllAnimations();
        //this._idle.loopAnimation = true;

        shadowGenerator.forEach(element => {
            element.addShadowCaster(this.mesh); //the player mesh will cast shadows
        });
    }
}
