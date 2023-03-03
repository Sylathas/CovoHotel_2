import { TransformNode, ShadowGenerator, Scene, Vector3, PointerEventTypes, AbstractMesh, AnimationGroup, ArcRotateCamera, Scalar, LensRenderingPipeline, DefaultRenderingPipeline } from "@babylonjs/core";
import { AdvancedDynamicTexture, Container, StackPanel, Control, TextBlock } from "@babylonjs/gui";

import { uiElement } from "./uiElement";
import { convsMale } from "./dialogues";

export class NPC extends TransformNode {
    private camera: ArcRotateCamera;
    private scene: Scene;
    private canvas: HTMLCanvasElement;

    //Animation
    private _idle: AnimationGroup;

    //NPC 
    private mesh: AbstractMesh; //outer collisionbox of NPC

    //DIALOGUE
    private dialogueCounterGlobal: number = 0; //index of conversation
    private dialogueCounterLocal: number = 0; //index of text of current conversation
    private dialogueText: TextBlock;
    private dialogues;

    // --FOR CAMERA MOVEMENT--

    // Vectors for the camera's position and target
    private nextCameraRadius: number;
    private nextCameraTarget: Vector3;
    private oldPos: Vector3;

    // Bools to keep track of states
    private enableAnim: boolean = false;

    constructor(assets ,scene: Scene, shadowGenerator: ShadowGenerator, position: Vector3, name: string, camera, canvas: HTMLCanvasElement) {
        super(name, scene);
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.dialogues = convsMale;

        //Initialize the NPC 
        const copyMesh = this.scene.getMeshByName(assets.name);
        this.mesh = copyMesh.clone(name, this);
        this.mesh.position = position;

        //animate NPC with Idle animation
        this._idle = assets.animationGroups[1];
        this.scene.stopAllAnimations();
        this._idle.loopAnimation = true;

        shadowGenerator.addShadowCaster(this.mesh); //the NPC mesh will cast shadows

        //Add event on click of NPC
        this.scene.onPointerObservable.add((pointerInfo) => {      		
            switch (pointerInfo.type) {
		        case PointerEventTypes.POINTERDOWN:
			        if(pointerInfo.pickInfo.hit) {
                        this.pointerDown(pointerInfo.pickInfo.pickedMesh);
                    }
		        break;
            }
        });

        this.scene.registerBeforeRender(() => {
            this._animateNPC();

            if(this.enableAnim) {
                if(this.camera.inputs.attachedToElement){
                    this.camera.detachControl();
                }
                if(Vector3.Distance(this.scene.getTransformNodeById('root').position, this.nextCameraTarget) > 0.1) {
                    //this.camera.radius = Scalar.Lerp(this.camera.radius, this.nextCameraRadius, .2);
                    this.scene.getTransformNodeById('root').position = Vector3.Lerp(this.scene.getTransformNodeById('root').position, this.nextCameraTarget, 0.05);
                } else { // If we're close enough, finalize movement and disable animation
                    this.scene.getTransformNodeById('root').position = this.nextCameraTarget;
                    this.enableAnim = false;
                    this.camera.attachControl(this.canvas, true);
                    if(this.nextCameraTarget === this.oldPos) {
                        this.scene.getTransformNodeById('convOpen').setEnabled(true);
                    }
                }
            }
        });
    }

    private pointerDown = (mesh) => {
        if (mesh.name.startsWith(this.name) && !this.enableAnim) { //check that the picked mesh is the NPC
            this.nextCameraRadius = 10.5;
            this.oldPos = this.scene.getTransformNodeById('root').position;
            this.nextCameraTarget = this.mesh.position;
            this.enableAnim = true;
            this._dialogue();
            this.scene.getTransformNodeById('convOpen').setEnabled(false);
        } 
    }

    private _animateNPC(): void {
        this._idle.play(this._idle.loopAnimation);
    }

    private _dialogue(): any {
        //for internal functions
        let game = this;

        this.camera.detachControl();

        //Create depth of field effect
        var lensEffect = new LensRenderingPipeline('lens', {
            dof_focus_distance: 2000,
            dof_aperture: 6.0,			// set this very high for tilt-shift effect
            dof_pentagon: true,
        }, this.scene, 1.0, [this.camera]);
    
        // -- CREATE DIALOGUE GUI--
        const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("DialogueUI");
        playerUI.layer.layerMask = 0x10000000;
        
        //Create dialogue container
        var dialogue = new StackPanel('DialogueContainer');
        dialogue.width = "800px";
        dialogue.height = "348px";
        dialogue.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        dialogue.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        playerUI.addControl(dialogue);

        //Create dialogue image containers
        var dialogueNameContainer = new Container('dialogueNameContainer');
        var dialogueMenuContainer = new Container('dialogueMenuContainer');
        dialogueNameContainer.width = "444px";
        dialogueNameContainer.height = "100px";
        dialogueNameContainer.paddingBottom = '50px';
        dialogueMenuContainer.width = "800px";
        dialogueMenuContainer.height = "250px";
        dialogue.addControl(dialogueNameContainer);
        dialogue.addControl(dialogueMenuContainer);
        
        //Create 
        var dialogueName = uiElement("dialogueName", "/textures/UI/DialogueName.png", '444px', '48px', 'dialogue');
        var dialogueMenu = uiElement("dialogueImage", "/textures/UI/Dialogue.png", '800px', '250px', 'dialogue');
        dialogueNameContainer.addControl(dialogueName);
        dialogueMenuContainer.addControl(dialogueMenu);
    
        //Add interaction on Click
        dialogue.isPointerBlocker = true;
        dialogue.onPointerDownObservable.add(function () {
            if(!game.enableAnim && !game.dialogues[game.name][game.dialogueCounterGlobal][game.dialogueCounterLocal]){
                if(game.dialogues[game.name][game.dialogueCounterGlobal + 1]){
                    game.dialogueCounterGlobal++;
                }
                game.dialogueCounterLocal = 0;
                playerUI.dispose();
                lensEffect.dispose();
                game.nextCameraTarget = game.oldPos;
                game.enableAnim = true;
                lensEffect.disableDepthOfField;
            } else if (game.dialogues[game.name][game.dialogueCounterGlobal][game.dialogueCounterLocal]) {
                game.dialogueText.text = game.dialogueText.text = convsMale[game.name][game.dialogueCounterGlobal][game.dialogueCounterLocal];
                game.dialogueCounterLocal++;
            }
            
        });

        //Create name text
        let nameText = new TextBlock();
        nameText.text = this.name;
        nameText.color = "white";
        nameText.fontSize = 24;
        dialogueNameContainer.addControl(nameText);  

        //Create initial dialogue text
        this.dialogueText = new TextBlock();
        this.dialogueText.text = game.dialogues[this.name][this.dialogueCounterGlobal][this.dialogueCounterLocal];
        this.dialogueText.color = "white";
        this.dialogueText.textWrapping = true;
        this.dialogueText.setPadding(0, 50, 0, 50);
        this.dialogueText.fontSize = 24;
        dialogueMenuContainer.addControl(this.dialogueText);  
        this.dialogueCounterLocal++;
    
        //check if device is mobile or desktop, and change UI accordingly
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    
        }
    }
}
