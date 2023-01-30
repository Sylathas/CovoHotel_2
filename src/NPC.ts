import { TransformNode, ShadowGenerator, Scene, Mesh, UniversalCamera, ArcRotateCamera, Vector3, Quaternion, Ray, ParticleSystem, ActionManager, ExecuteCodeAction, Texture, Color4, Color3, SphereParticleEmitter } from "@babylonjs/core";

export class NPC extends TransformNode {
    public camera;
    public scene: Scene;
    private _canvas: HTMLCanvasElement;

    //NPC 
    public mesh: Mesh; //outer collisionbox of NPC
    private _camRoot: TransformNode;    

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator, canvas: HTMLCanvasElement) {
        super("player", scene);
        this._canvas = canvas;
        this.scene = scene;

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        this._setupNPC();

        shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows
    }

    private _setupNPC() {
        //root camera parent that handles positioning of the camera to follow the player
        this._camRoot = new TransformNode("root");
        this._camRoot.position = new Vector3(0, 0, 0); //initialized at (0,0,0)
        //to face the player from behind (180 degrees)
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);
    }
}