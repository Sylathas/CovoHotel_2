import { Scene, AbstractMesh, SceneLoader, ShadowGenerator, PointLight, Vector3, Color3 } from "@babylonjs/core";
import { Player } from "./characterController";

export class Environment {
    private _scene: Scene;

    //Meshes
    public environmentModel: string; //mesh of the map
    public shadowGenerators = [];

    constructor(scene: Scene, environment: string) {
        this._scene = scene;
        this.environmentModel = environment;
    }

    //What we do once the environment assets have been imported
    //handles setting the necessary flags for collision and trigger meshes,
    public async load() {
        const assets = await this._loadAsset();
        //Loop through all environment meshes that were imported
        assets.allMeshes.forEach((m) => {

            m.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
            m.freezeWorldMatrix();

            if (m.name == "ground") {
                //dont check for collisions, dont allow for raycasting to detect it(cant land on it)
                m.checkCollisions = false;
                m.isPickable = false;
                m.doNotSyncBoundingInfo = true;
            }
            //areas that will use box collisions
            if (m.name.includes("stairs")) {
                m.checkCollisions = false;
                m.isPickable = false;
            }
            //collision meshes
            if (m.name.includes("collision")) {
                m.isVisible = false;
                m.isPickable = true;
                m.checkCollisions = true;
            }
            //trigger meshes 
            if (m.name.includes("trigger")) {
                m.isVisible = false;
                m.isPickable = false;
                m.checkCollisions = false;
            }
            //ground mesh
            if (m.name.includes("Terrain")) {
                m.receiveShadows = true;
                m.isPickable = false;
            }

            m.material.freeze()
            m.freezeWorldMatrix();

        });
    }

    private async _loadAsset() {
        //load environment mesh
        const result = await SceneLoader.ImportMeshAsync(null, "./models/", this.environmentModel, this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();

        return {
            env: env, //reference to our entire imported glb (meshes and transform nodes)
            allMeshes: allMeshes, // all of the meshes that are in the environment
        };
    }
}