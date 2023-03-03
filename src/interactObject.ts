import { TransformNode, ShadowGenerator, Scene, Mesh, PointerEventTypes, AbstractMesh, AnimationGroup } from "@babylonjs/core";

export class InteractObject extends TransformNode {
    public camera;
    public scene: Scene;
    private _canvas: HTMLCanvasElement;

    //Animation
    private _idle: AnimationGroup;

    //NPC 
    public mesh: AbstractMesh; //outer collisionbox of Interactible Object

    constructor(assets ,scene: Scene, shadowGenerator: ShadowGenerator, canvas: HTMLCanvasElement, position, name) {
        super(name, scene);
        this._canvas = canvas;
        this.scene = scene;

        //Initialize the Interactible Object 
        const copyMesh = this.scene.getMeshByName(assets.name);
        this.mesh = copyMesh.clone(name, this);
        this.mesh.position = position;

        shadowGenerator.addShadowCaster(this.mesh); //the Interactible Object mesh will cast shadows

        //animate NPC with Idle animation
        this._idle = assets.animationGroups[1];
        this.scene.stopAllAnimations();
        this._idle.loopAnimation = true;

        //Add event on click of NPC
        this.scene.onPointerObservable.add((pointerInfo) => {      		
            switch (pointerInfo.type) {
		        case PointerEventTypes.POINTERDOWN:
			        if(pointerInfo.pickInfo.hit) {
                        this.pointerDown(pointerInfo.pickInfo.pickedMesh)
                    }
		        break;
            }
        });

        this.scene.registerBeforeRender(() => {
            this._animateInteractObject();
        });
    }

    private pointerDown = (mesh) => {
        if (mesh.name.startsWith(this.name)) { //check that the picked mesh is the Interactible Object
            console.log('activate object');
        }
    }

    private _animateInteractObject(): void {
        this._idle.play(this._idle.loopAnimation);
    }
}