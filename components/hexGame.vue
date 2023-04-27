<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  WebGLRenderer, ACESFilmicToneMapping, sRGBEncoding,
  Color, CylinderGeometry,
  RepeatWrapping, DoubleSide, BoxGeometry, Mesh, PointLight, MeshPhysicalMaterial, PerspectiveCamera,
  Scene, PMREMGenerator, PCFSoftShadowMap,
  Vector2, TextureLoader, SphereGeometry, MeshStandardMaterial,
  ConeGeometry, Raycaster, MOUSE
} from 'three'
import type { Texture } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
// eslint-disable-next-line import/named
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils'
import { createNoise2D } from 'simplex-noise'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle
} from '@headlessui/vue'
import sampleSize from 'lodash/sampleSize'
import defaultHexgame from '@/data/default_hexgame.json'
import anleitung from '@/data/anleitung.json'

// ----------------------------------------------------------  modal -------------------------

const isOpen = ref(false)
const modalNumber = ref('0')

const modaltitle = ref(anleitung[0].title)
const modaltext = ref(anleitung[0].content)

function setIsOpen (value) {
  isOpen.value = value
}

function setModalNumber (value) {
  modalNumber.value = value
}

function setModalText (value) {
  modaltext.value = value
}

function setModalTitel (value) {
  modaltitle.value = value
}

// ---------------------------------------------------------- three.js -----------------------

type hexDataType = {
  'title': string,
  'content': string,
  'image'?: string
}

interface Props {
  hexData?: hexDataType | undefined,
}

const props = withDefaults(defineProps<Props>(), {
  hexData: defaultHexgame
})

onMounted(() => {
  const scene = new Scene()
  scene.background = new Color('#FFEECC')

  const camera = new PerspectiveCamera(45, (innerWidth - 1) / (innerHeight -1), 0.1, 1000)
  camera.position.set(-17, 31, 33)

  const raycaster = new Raycaster()
  const pointer = new Vector2()

  const renderer = new WebGLRenderer({
    antialias: true,
    canvas: threeCanvas.value as HTMLCanvasElement
  })
  renderer.setSize(innerWidth - 1, innerHeight - 1)
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.outputEncoding = sRGBEncoding
  renderer.useLegacyLights = true
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap
  document.getElementById('threeCanvas').appendChild(renderer.domElement)

  const light = new PointLight(new Color('#FFCB8E').convertSRGBToLinear().convertSRGBToLinear(), 10, 100)
  light.position.set(10, 20, 10)

  light.castShadow = true
  light.shadow.mapSize.width = 512
  light.shadow.mapSize.height = 512
  light.shadow.camera.near = 0.5
  light.shadow.camera.far = 500
  scene.add(light)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 0)
  controls.dampingFactor = 0.05
  controls.enableDamping = true

  const pmrem = new PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()

  let envmap: Texture

  const MAX_HEIGHT = 10
  const coordsMarkerMax = []

  async function init () {
    const envmapTexture = await new RGBELoader().loadAsync('/envmap.hdr')
    const rt = pmrem.fromEquirectangular(envmapTexture)
    envmap = rt.texture

    const textures = {
      dirt: await new TextureLoader().loadAsync('/img/dirt.png'),
      dirt2: await new TextureLoader().loadAsync('/img/dirt2.jpg'),
      grass: await new TextureLoader().loadAsync('/img/grass.jpg'),
      sand: await new TextureLoader().loadAsync('/img/sand.jpg'),
      water: await new TextureLoader().loadAsync('/img/water.jpg'),
      stone: await new TextureLoader().loadAsync('/img/stone.png'),
      marker: await new TextureLoader().loadAsync('/img/marker.jpg')
    }

    let coordsMarker = []

    // Generation of game field

    const simplex = createNoise2D() // optional seed as a string parameter

    for (let i = -20; i <= 20; i++) {
      for (let j = -20; j <= 20; j++) {
        const position = tileToPosition(i, j)

        if (position.length() > 16) { continue }

        let noise = (simplex(i * 0.1, j * 0.1) + 1) * 0.5
        noise = Math.pow(noise, 1.5)

        hex(noise * MAX_HEIGHT, position)
      }
    }

    coordsMarker = sampleSize(coordsMarkerMax, props.hexData.length)

    const stoneMesh = hexMesh(stoneGeo, textures.stone)
    const grassMesh = hexMesh(grassGeo, textures.grass)
    const dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2)
    const dirtMesh = hexMesh(dirtGeo, textures.dirt)
    const sandMesh = hexMesh(sandGeo, textures.sand)
    scene.add(stoneMesh, dirtMesh, dirt2Mesh, sandMesh, grassMesh)

    Object.entries(coordsMarker).forEach((element) => {
      const hexGeo = mergeGeometries([new BoxGeometry(0, 0, 0), marker(element[1].height, element[1].position)])
      const hexMaesh = hexMeshClick(hexGeo, textures.marker, String(Number(element[0]) + 1))
      scene.add(hexMaesh)
    })

    const seaTexture = textures.water
    seaTexture.repeat = new Vector2(1, 1)
    seaTexture.wrapS = RepeatWrapping
    seaTexture.wrapT = RepeatWrapping

    const seaMesh = new Mesh(
      new CylinderGeometry(17, 17, MAX_HEIGHT * 0.2, 50),
      new MeshPhysicalMaterial({
        envMap: envmap,
        color: new Color('#55aaff').convertSRGBToLinear().multiplyScalar(3),
        ior: 1.4,
        transmission: 1,
        transparent: true,
        thickness: 1.5,
        envMapIntensity: 0.2,
        roughness: 1,
        metalness: 0.025,
        roughnessMap: seaTexture,
        metalnessMap: seaTexture
      })
    )
    seaMesh.receiveShadow = true
    seaMesh.rotation.y = -Math.PI * 0.333 * 0.5
    seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0)
    scene.add(seaMesh)

    const mapContainer = new Mesh(
      new CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
      new MeshPhysicalMaterial({
        envMap: envmap,
        map: textures.dirt,
        envMapIntensity: 0.2,
        side: DoubleSide
      })
    )
    mapContainer.receiveShadow = true
    mapContainer.rotation.y = -Math.PI * 0.333 * 0.5
    mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0)
    scene.add(mapContainer)

    const mapFloor = new Mesh(
      new CylinderGeometry(18.5, 18.5, MAX_HEIGHT * 0.1, 50),
      new MeshPhysicalMaterial({
        envMap: envmap,
        map: textures.dirt2,
        envMapIntensity: 0.1,
        side: DoubleSide
      })
    )
    mapFloor.receiveShadow = true
    mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0)
    scene.add(mapFloor)

    clouds()

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(scene, camera)
    })
  }

  function tileToPosition (tileX: number, tileY: number) {
    return new Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535)
  }

  function hexGeometry (height: number, position: Vector2) {
    const geo = new CylinderGeometry(1, 1, height, 6, 1, false)
    geo.translate(position.x, height * 0.5, position.y)

    return geo
  }

  const STONE_HEIGHT = MAX_HEIGHT * 0.8
  const DIRT_HEIGHT = MAX_HEIGHT * 0.7
  const GRASS_HEIGHT = MAX_HEIGHT * 0.5
  const SAND_HEIGHT = MAX_HEIGHT * 0.3
  const DIRT2_HEIGHT = MAX_HEIGHT * 0

  let stoneGeo = new BoxGeometry(0, 0, 0)
  let dirtGeo = new BoxGeometry(0, 0, 0)
  let dirt2Geo = new BoxGeometry(0, 0, 0)
  let sandGeo = new BoxGeometry(0, 0, 0)
  let grassGeo = new BoxGeometry(0, 0, 0)

  function hex (height: number, position: Vector2) {
    const geo = hexGeometry(height, position)
    let specialPositionMarker = false

    if (height > STONE_HEIGHT) {
      stoneGeo = mergeGeometries([geo, stoneGeo])

      if (Math.random() > 0.8) {
        stoneGeo = mergeGeometries([stoneGeo, stone(height, position)])
        specialPositionMarker = true
      }

      if (Math.random() < 0.2) {
        stoneGeo = mergeGeometries([stoneGeo, stone(height, position)])
        specialPositionMarker = true
      }
    } else if (height > DIRT_HEIGHT) {
      dirtGeo = mergeGeometries([geo, dirtGeo])

      if (Math.random() > 0.8) {
        grassGeo = mergeGeometries([grassGeo, tree(height, position)])
        specialPositionMarker = true
      }
    } else if (height > GRASS_HEIGHT) {
      grassGeo = mergeGeometries([geo, grassGeo])
    } else if (height > SAND_HEIGHT) {
      sandGeo = mergeGeometries([geo, sandGeo])

      if (Math.random() > 0.8 && stoneGeo) {
        stoneGeo = mergeGeometries([stoneGeo, stone(height, position)])
        specialPositionMarker = true
      }
    } else if (height > DIRT2_HEIGHT) {
      dirt2Geo = mergeGeometries([geo, dirt2Geo])
    }

    if (height > SAND_HEIGHT && !specialPositionMarker) {
      coordsMaxPush(height, position)
    }
  }

  function hexMesh (geo: BoxGeometry, map: Texture) {
    const mat = new MeshPhysicalMaterial({
      envMap: envmap as Texture,
      envMapIntensity: 0.135,
      flatShading: true,
      map
    })

    const mesh = new Mesh(geo, mat)
    mesh.castShadow = true // default is false
    mesh.receiveShadow = true // default
    mesh.userData = {
      MARKER: false
    }

    return mesh
  }

  function hexMeshClick (geo: BoxGeometry, map: Texture, num: string) {
    const mat = new MeshPhysicalMaterial({
      envMap: envmap as Texture,
      envMapIntensity: 0.135,
      flatShading: true,
      map
    })

    const mesh = new Mesh(geo, mat)
    mesh.castShadow = true // default is false
    mesh.receiveShadow = true // default
    mesh.userData = {
      MARKER: true,
      MODALNUMBER: num
    }

    return mesh
  }

  function tree (height: number, position: { x: number; y: number; }) {
    const treeHeight = Math.random() * 1 + 1.25

    const geo = new CylinderGeometry(0, 1.5, treeHeight, 3)
    geo.translate(position.x, height + treeHeight * 0 + 1, position.y)

    const geo2 = new CylinderGeometry(0, 1.15, treeHeight, 3)
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y)

    const geo3 = new CylinderGeometry(0, 0.8, treeHeight, 3)
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y)

    return mergeGeometries([geo, geo2, geo3])
  }

  function marker (height: number, position: { x: number; y: number; }) {
    const radius = 0.6
    const sphereRadius = 0.6

    const cone = new ConeGeometry(radius, 2, 16, 1, true)
    cone.rotateX(Math.PI)
    cone.translate(position.x, height + 1, position.y)

    const sphere = new SphereGeometry(sphereRadius, 16, 8)
    sphere.translate(position.x, +height + 2, position.y)

    return mergeGeometries([cone, sphere])
  }

  function stone (height: number, position: { x: number; y: number; }) {
    const px = Math.random() * 0.4
    const pz = Math.random() * 0.4

    const geo = new SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7)
    geo.translate(position.x + px, height, position.y + pz)

    return geo
  }

  function clouds () {
    let geo = new SphereGeometry(0, 0, 0)
    const count = Math.floor(Math.pow(Math.random(), 0.45) * 4)

    for (let i = 0; i < count; i++) {
      const puff1 = new SphereGeometry(1.2, 7, 7)
      const puff2 = new SphereGeometry(1.5, 7, 7)
      const puff3 = new SphereGeometry(0.9, 7, 7)

      puff1.translate(-1.85, Math.random() * 0.3, 0)
      puff2.translate(0, Math.random() * 0.3, 0)
      puff3.translate(1.85, Math.random() * 0.3, 0)

      const cloudGeo = mergeGeometries([puff1, puff2, puff3])
      cloudGeo.translate(
        Math.random() * 20 - 10,
        Math.random() * 7 + 10,
        Math.random() * 20 - 10
      )
      cloudGeo.rotateY(Math.random() * Math.PI * 2)

      geo = mergeGeometries([geo, cloudGeo])
    }

    const mesh = new Mesh(
      geo,
      new MeshStandardMaterial({
        envMap: envmap,
        envMapIntensity: 0.75,
        flatShading: true
      // transparent: true,
      // opacity: 0.85,
      })
    )

    scene.add(mesh)
  }

  function coordsMaxPush (getHeight, getPosition) {
    coordsMarkerMax.push({
      height: getHeight,
      position: getPosition
    })
  }

  function onPointerClick (event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

    render()
  }

  async function render() {
    const delay = ms => new Promise(res => setTimeout(res, ms))

    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera)

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, false)

    if (intersects.length > 0) {
    // select the marker
      if (intersects[0].object.userData.MARKER === true) {
        intersects[0].object.material.color.set(0xFF0000)
        setModalTitel(props.hexData[Number(intersects[0].object.userData.MODALNUMBER) - 1].title)
        setModalText(props.hexData[Number(intersects[0].object.userData.MODALNUMBER) - 1].content)
        if ('MathJax' in window) {
          window.MathJax.typeset()
          nextTick(() => {
            window.MathJax.typeset()
          })
        }
        setIsOpen(true)
        setModalNumber(intersects[0].object.userData.MODALNUMBER)
        await delay(500)
        intersects[0].object.material.color.set(0xFFFFFF)
      }
    }

    renderer.render(scene, camera)
  }

  init()
  window.addEventListener('click', onPointerClick)

window.addEventListener('resize', onWindowResize)

function onWindowResize(){
  camera.aspect = (innerWidth -1 ) / (innerHeight - 1);
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth - 1, innerHeight - 1);
}

})

function help(){
  setModalNumber()
  setModalTitel(anleitung[0].title)
        setModalText(anleitung[0].content)
        setIsOpen(true)

}
</script>

<template>
  <div class="absolute top-2 right-2 rounded-full cursor-pointer bg-blue-100 p-2 border-2 border-blue-900 px-4 font-bold" @click="help()">
    ?
  </div>
  <div id="threeCanvas" />
  <TransitionRoot :show="isOpen" as="template">
    <Dialog :open="isOpen" class="relative z-50" @close="setIsOpen">
      <TransitionChild
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <!-- The backdrop, rendered as a fixed sibling to the panel container -->
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
      </TransitionChild>

      <!-- Full-screen container to center the panel -->
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          enter="duration-300 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <!-- The actual dialog panel -->
          <DialogPanel
            class="w-full sm:w-[500px] transform overflow-hidden rounded-2xl bg-white p-4 text-left align-middle shadow-xl transition-all"
          >
            <DialogTitle
              as="h3"
              class="text-lg font-medium leading-6 text-gray-900"
            >
            <span v-html="modaltitle"></span> (Nr. {{ modalNumber }})
            </DialogTitle>

            <div class="mt-1 pt-1 border-blue-100 border-t-2">
              <p class="text-sm text-gray-500" v-html="modaltext"></p>
            </div>

            <div class="mt-4">
              <button
                type="button"
                class="w-full inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                @click="setIsOpen(false)"
              >
                Schließen
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
