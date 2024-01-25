import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'

import * as Shaders from './assets/shaders.js'

const scene = new THREE.Scene()

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0)
})
const slipperyMaterial = new CANNON.Material('slippery')
const groundMaterial = new CANNON.Material('ground')

const ground_slippery = new CANNON.ContactMaterial(groundMaterial, slipperyMaterial, {
  friction: 0,
  restitution: 0,
  contactEquationStiffness: 1e8,
  contactEquationRelaxation: 3
})
world.addContactMaterial(ground_slippery)

const ground = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
  material: groundMaterial
})
ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(ground)

const cannonDebugger = new CannonDebugger(scene, world)

// camera
const testCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000)
testCamera.position.set(100, 300, -100)

const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(100, 300, -100)
const helper = new THREE.CameraHelper(camera);
//scene.add(helper)

// renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('bg')
})
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)

// composer
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new ShaderPass(FXAAShader))
composer.addPass(new ShaderPass({
  vertexShader: Shaders.chromaVS,
  fragmentShader: Shaders.chromaFS,
  uniforms: {
    map: composer.readBuffer.texture,
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }

  }
  //uniforms: { resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) } }
}))
console.log(composer)

// gridHelper
const gridHelper = new THREE.GridHelper(2000, 50)
scene.add(gridHelper)

//lights
const ambientLight = new THREE.AmbientLight(0x99ff99, 1)
scene.add(ambientLight)

const topLight = new THREE.PointLight(0xffffff, 10000)
topLight.position.y = 300
topLight.position.x = 50
scene.add(topLight)

const objLoader = new OBJLoader()

// player
const player = new CANNON.Body({
  mass: 10,
  shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
  material: slipperyMaterial
})
player.position.set(0, 10, 0)
world.addBody(player)

//model
let playerModel

const dogMaterial = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: Shaders.dogVS,
  fragmentShader: Shaders.dogFS
})

const placeHolderMaterial = new THREE.MeshToonMaterial({ color: 0xffffff })

objLoader.load('assets/doggo_merged.obj',
  function (obj) {
    obj.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        child.material = placeHolderMaterial;
      }
    });
    scene.add(obj);
    playerModel = obj;
    console.log(obj)
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + "% loaded")
  },
  function (err) {
    console.error("Error loading 'doggo_merged.obj': " + err)
  }
);

const tGeometry = new THREE.TorusGeometry(10, 2, 16, 20);
const tMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const torus = new THREE.Mesh(tGeometry, tMaterial);
torus.quaternion.set(0.6, 0, 0, 1)
scene.add(torus);

const cubeGeometry = new THREE.BoxGeometry(100, 100, 100);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);
cube.position.set(200, 50, 100)

//controls

const controls = new OrbitControls(camera, renderer.domElement);

// player controls
let upPressed = false
let leftPressed = false
let downPressed = false
let rightPressed = false
let movementSpeed = 300

let cameraLock = true
window.addEventListener('keydown', (e) => {
  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      upPressed = true
      break;
    case 'arrowleft':
    case 'a':
      leftPressed = true
      break;
    case 'arrowdown':
    case 's':
      downPressed = true
      break;
    case 'arrowright':
    case 'd':
      rightPressed = true
      break;
  }
})

window.addEventListener('keyup', (e) => {
  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      upPressed = false
      break;
    case 'arrowleft':
    case 'a':
      leftPressed = false
      break;
    case 'arrowdown':
    case 's':
      downPressed = false
      break;
    case 'arrowright':
    case 'd':
      rightPressed = false
      break;
  }
})

function playerMovement() {
  let pVelocity = player.velocity

  if (upPressed == true && downPressed != true) {

    pVelocity.x = movementSpeed * Math.sin(rotationRadians)
    pVelocity.z = movementSpeed * Math.cos(rotationRadians)
  }
  if (leftPressed == true && rightPressed != true) {
    pVelocity.x = movementSpeed * Math.cos(rotationRadians)
    pVelocity.z = movementSpeed * Math.sin(-rotationRadians)
  }
  if (downPressed == true && upPressed != true) {
    pVelocity.x = -movementSpeed * Math.sin(rotationRadians)
    pVelocity.z = -movementSpeed * Math.cos(rotationRadians)
  }
  if (rightPressed == true && leftPressed != true) {
    pVelocity.x = -movementSpeed * Math.cos(rotationRadians)
    pVelocity.z = -movementSpeed * Math.sin(-rotationRadians)
  }
}

function cameraRotateWithPlayer() {
  const idealOffset = new THREE.Vector3(
    playerModel.position.x - 300 * Math.sin(rotationRadians),
    playerModel.position.y + 250,
    playerModel.position.z - 40 * Math.cos(rotationRadians)
  )

  const idealLookat = new THREE.Vector3(
    playerModel.position.x + 250 * Math.sin(rotationRadians),
    playerModel.position.y,
    playerModel.position.z + 250 * Math.cos(rotationRadians)
  )

  camera.position.lerp(idealOffset, 1)
  camera.lookAt(idealLookat)
  testCamera.lookAt(idealLookat.x, idealLookat.y, idealLookat.z)
}

let rotationRadians = 0
let upAngleRadians = 0
const pointerControls = new PointerLockControls(camera, document.body)
document.getElementById('lock').addEventListener('click', function () {
  pointerControls.lock()
  let spins = 0
  const pi = Math.PI
  addEventListener('mousemove', (e) => {
    let mouseX = e.movementX * 0.001
    let mouseY = e.movementY * 0.001

    upAngleRadians = camera.rotation.x
    camera.rotation.x -= mouseY

    playerModel.rotation.y -= mouseX
    rotationRadians = playerModel.rotation.y - spins * pi * 2

    if (Math.abs(rotationRadians) > pi * 2) {
      rotationRadians += Math.sign(rotationRadians) * pi * 2
      spins += Math.sign(rotationRadians)
    }
    cameraRotateWithPlayer(rotationRadians)
  })
})

//gameloop
function animate() {
  requestAnimationFrame(animate, 33)

  world.fixedStep()
  cannonDebugger.update()

  playerModel.position.copy(player.position)
  playerModel.position.y -= 2

  controls.update();

  playerMovement()

  //if (cameraLock == true) { cameraRotateWithPlayer() }

  composer.render(scene, camera)
}

animate()

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
