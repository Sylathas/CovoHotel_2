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
    private _dialogueOn: boolean = false;
    private dialogues = convsMale;
    private goldPass: boolean = false;
    private covoPin: boolean = false;
    private businessCard: boolean = false;
    public gotoDream: boolean = false;

    // --FOR CAMERA MOVEMENT--

    // Vectors for the camera's position and target
    private nextCameraRadius: number;
    private nextCameraTarget: Vector3;
    private oldPos: Vector3;

    // Bools to keep track of states
    private enableAnim: boolean = false;

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator[], position: Vector3, name: string, camera, canvas: HTMLCanvasElement) {
        super(name, scene);
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.dialogues = convsMale;
        const game = this;

        //Initialize the NPC 
        this.mesh = assets.mesh;
        this.mesh.position = position;

        //animate NPC with Idle animation
        this._idle = assets.animationGroups[0];
        this._idle.loopAnimation = true;

        shadowGenerator.forEach(element => {
            element.addShadowCaster(this.mesh); //the NPC mesh will cast shadows
        });

        //Add event on click of NPC
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.pickInfo.hit) {
                        this.pointerDown(pointerInfo.pickInfo.pickedMesh);
                    }
                    break;
            }
        });

        //System of dialogue on click
        $(document).on('click', () => {
            console.log('click');
            if (game._dialogueOn) {
                //End conversation if the dialogues are finished
                if (!game.enableAnim && !game.dialogues[game.name][game.dialogueCounterGlobal][game.dialogueCounterLocal]) {

                    //Check if the pusher gives you the golden pass
                    if (game.name === 'Plug' && game.dialogueCounterGlobal == 1 && !game.goldPass) {
                        game.goldPass = true;
                        $('#ticket').css('display', 'block');
                        setTimeout(() => {
                            $('#ticket').css('transform', 'translate(50%, 50%) scale(1)');
                        }, 100);
                        setTimeout(() => {
                            $('#ticket').css({ 'bottom': '50px', 'right': '50px', 'transform': 'scale(1)', 'width': '150px', 'height': '150px', 'pointer-events': 'all' });
                        }, 1000);
                    }

                    //Check if the owner gives you the pin
                    if (game.name === 'Owner' && game.dialogueCounterGlobal == 2 && !game.covoPin) {
                        game.covoPin = true;
                        $('#spilla').css('display', 'block');
                        setTimeout(() => {
                            $('#spilla').css('transform', 'translate(50%, 50%) scale(1)');
                        }, 100);
                        setTimeout(() => {
                            $('#spilla').css({ 'bottom': '250px', 'right': '50px', 'transform': 'scale(1)', 'width': '150px', 'height': '150px', 'pointer-events': 'all' });
                        }, 1000);
                    }

                    //Check if the businessman gives you the business card
                    if (game.name === 'Businessman' && game.dialogueCounterGlobal == 3 && !game.businessCard) {
                        game.businessCard = true;
                        $('#businessCard').css('display', 'block');
                        setTimeout(() => {
                            $('#businessCard').css('transform', 'translate(50%, 50%) scale(1)');
                        }, 100);
                        setTimeout(() => {
                            $('#businessCard').css({ 'bottom': '450px', 'right': '50px', 'transform': 'scale(1)', 'width': '150px', 'height': '150px', 'pointer-events': 'all' });
                        }, 1000);
                    }

                    if (game.name === 'Dream') {
                        this.gotoDream = true;
                    }

                    if (game.dialogues[game.name][game.dialogueCounterGlobal + 1]) {
                        game.dialogueCounterGlobal++;
                    }
                    game.dialogueCounterLocal = 0;
                    game.nextCameraTarget = game.oldPos;
                    game.enableAnim = true;
                    game._dialogueOn = false;


                    //make div disappear
                    $('#dialogueContainer').css('opacity', '0');
                    setTimeout(() => {
                        $('#dialogueContainer').css('display', 'none');
                    }, 500);
                    //Continue conversation if dialogues are not finished
                } else if (game.dialogues[game.name][game.dialogueCounterGlobal][game.dialogueCounterLocal]) {
                    $('.dialogue div').text(convsMale[game.name][game.dialogueCounterGlobal][game.dialogueCounterLocal]);
                    game.dialogueCounterLocal++;
                }
            }
        });

        this.scene.registerBeforeRender(() => {
            this._animateNPC();

            if (this.enableAnim) {
                if (this.camera.inputs.attachedToElement) {
                    this.camera.detachControl();
                }
                if (Vector3.Distance(this.scene.getTransformNodeById('root').position, this.nextCameraTarget) > 0.1) {
                    //this.camera.radius = Scalar.Lerp(this.camera.radius, this.nextCameraRadius, .2);
                    this.scene.getTransformNodeById('root').position = Vector3.Lerp(this.scene.getTransformNodeById('root').position, this.nextCameraTarget, 0.05);
                } else { // If we're close enough, finalize movement and disable animation
                    this.scene.getTransformNodeById('root').position = this.nextCameraTarget;
                    this.enableAnim = false;
                    if (this.nextCameraTarget === this.oldPos) {
                        this.scene.getTransformNodeById('convOpen').setEnabled(true);
                        this.camera.attachControl(this.canvas, true);
                    }
                }
            }
        });
    }

    private pointerDown = (mesh) => {
        console.log(this.name, mesh);
        if (mesh.name.startsWith(this.name) && !this.enableAnim && this.name != 'Deadman') { //check that the picked mesh is the NPC
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
        this.camera.detachControl();

        //Initialize dialogue UI
        $('#dialogueContainer').css('display', 'flex');
        setTimeout(() => {
            $('#dialogueContainer').css('opacity', '1');
        }, 500);

        //Add first text
        $('.dialogue div').text(this.dialogues[this.name][this.dialogueCounterGlobal][this.dialogueCounterLocal]);
        $('.dialogueName').text(this.name);

        this._dialogueOn = true;
    }
}
