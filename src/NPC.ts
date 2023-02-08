import { TransformNode, ShadowGenerator, Scene, Mesh, PointerEventTypes } from "@babylonjs/core";

export class NPC extends TransformNode {
    public camera;
    public scene: Scene;
    private _canvas: HTMLCanvasElement;

    //NPC 
    public mesh: Mesh; //outer collisionbox of NPC

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator, canvas: HTMLCanvasElement, name, position, index) {
        super(name, scene);
        this._canvas = canvas;
        this.scene = scene;

        //Initialize the NPC 
        this.mesh = assets[index];
        this.mesh.parent = this;
        this.mesh.position = position;

        shadowGenerator.addShadowCaster(this.mesh); //the NPC mesh will cast shadows

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
        if (mesh === this.mesh) { //check that the picked mesh is the NPC
            console.log('activate');
        }
    }
}