import { Scene, Mesh, Vector3, SceneLoader, TransformNode, PBRMetallicRoughnessMaterial, ExecuteCodeAction, ActionManager, Texture, Color3 } from "@babylonjs/core";
import { Lantern } from "./lantern";
import { Player } from "./characterController";

export class Environment {
    private _scene: Scene;

    //Meshes
    public environmentModel: string; //mesh of the map

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
            if (m.name == "ground") {
                //dont check for collisions, dont allow for raycasting to detect it(cant land on it)
                m.checkCollisions = false;
                m.isPickable = false;
            }
            //areas that will use box collisions
            if (m.name.includes("stairs") || m.name == "cityentranceground" || m.name == "fishingground.001" || m.name.includes("lilyflwr")) {
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
            if (m.name.includes("Trigger")) {
                m.isVisible = false;
                m.isPickable = false;
                m.checkCollisions = false;
            }
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