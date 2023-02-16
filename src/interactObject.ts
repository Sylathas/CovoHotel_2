import { TransformNode, ShadowGenerator, Scene, Mesh, PointerEventTypes, AbstractMesh } from "@babylonjs/core";

export class InteractObject extends TransformNode {
    public camera;
    public scene: Scene;
    private _canvas: HTMLCanvasElement;

    //NPC 
    public mesh: AbstractMesh; //outer collisionbox of Interactible Object

    constructor(scene: Scene, shadowGenerator: ShadowGenerator, canvas: HTMLCanvasElement, name, position) {
        super(name, scene);
        this._canvas = canvas;
        this.scene = scene;

        //Initialize the NPC 
        const copyMesh = this.scene.getMeshByName(name);
        this.mesh = copyMesh.clone(name, this);
        this.mesh.position = position;

        shadowGenerator.addShadowCaster(this.mesh); //the Interactible Object mesh will cast shadows

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
    }

    private pointerDown = (mesh) => {
        if (mesh === this.mesh) { //check that the picked mesh is the Interactible Object
            console.log('activate object');
        }
    }
}