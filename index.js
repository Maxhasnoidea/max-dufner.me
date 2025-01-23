import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/geometries/TextGeometry.js';

// Cloth simulation parameters
const clothWidth = 10;
const clothHeight = 10;
const segmentsX = 20;
const segmentsY = 20;
const gravity = new THREE.Vector3(0, -9.81, 0).multiplyScalar(0.1);
const clothMass = 0.1;
const clothRestDistance = clothWidth / segmentsX;

// Wind parameters
const windStrength = 0.01;
let windForce = new THREE.Vector3(0.01, 0.01, 0.01); // Adjust this value to change the wind direction

// Weight parameters
const weightForce = new THREE.Vector3(0, 0, 0); // Adjust this value to change the weight force

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1); // Set background color to white
document.getElementById('container').appendChild(renderer.domElement);

// Add lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5).normalize();
scene.add(light);

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.z = 15;

// Create cloth geometry
const clothGeometry = new THREE.PlaneGeometry(clothWidth, clothHeight, segmentsX, segmentsY);
const clothMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide, wireframe: true });
const clothMesh = new THREE.Mesh(clothGeometry, clothMaterial);
scene.add(clothMesh);

// Cloth particles and constraints
const particles = [];
let constraints = [];

// Create particles at each intersection
for (let y = 0; y <= segmentsY; y++) {
    for (let x = 0; x <= segmentsX; x++) {
        particles.push({
            position: new THREE.Vector3(x / segmentsX * clothWidth - clothWidth / 2, y / segmentsY * clothHeight - clothHeight / 2, 0),
            previous: new THREE.Vector3(x / segmentsX * clothWidth - clothWidth / 2, y / segmentsY * clothHeight - clothHeight / 2, 0),
            original: new THREE.Vector3(x / segmentsX * clothWidth - clothWidth / 2, y / segmentsY * clothHeight - clothHeight / 2, 0),
            mass: clothMass,
            pinned: y === segmentsY && (x === 0 || x === segmentsX)
        });
    }
}

// Create constraints between particles
for (let y = 0; y < segmentsY; y++) {
    for (let x = 0; x < segmentsX; x++) {
        // Horizontal constraints
        constraints.push([particles[y * (segmentsX + 1) + x], particles[y * (segmentsX + 1) + x + 1], clothRestDistance]);
        // Vertical constraints
        constraints.push([particles[y * (segmentsX + 1) + x], particles[(y + 1) * (segmentsX + 1) + x], clothRestDistance]);
    }
}

// Add constraints for the last row and column
for (let x = 0; x < segmentsX; x++) {
    constraints.push([particles[segmentsY * (segmentsX + 1) + x], particles[segmentsY * (segmentsX + 1) + x + 1], clothRestDistance]);
}
for (let y = 0; y < segmentsY; y++) {
    constraints.push([particles[y * (segmentsX + 1) + segmentsX], particles[(y + 1) * (segmentsX + 1) + segmentsX], clothRestDistance]);
}

// Increase the number of iterations for the constraint solver
const constraintIterations = 10;

// Raycaster for detecting intersections
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDrawing = false;

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        isDrawing = true;
    }
}

function onMouseUp(event) {
    if (event.button === 0) { // Left mouse button
        isDrawing = false;
    }
}

// Event listener for keydown
function onKeyDown(event) {
    if (event.key === 'd') {
        downloadSceneAsJPG();
    }
}

function removeIntersectedConstraints() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(clothMesh);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        const face = intersect.face;
        const a = face.a;
        const b = face.b;
        const c = face.c;

        // Remove constraints involving the intersected vertices
        for (let i = constraints.length - 1; i >= 0; i--) {
            const [p1, p2] = constraints[i];
            const p1Index = particles.indexOf(p1);
            const p2Index = particles.indexOf(p2);
            if (p1Index === a || p1Index === b || p1Index === c || p2Index === a || p2Index === b || p2Index === c) {
                constraints.splice(i, 1);
                // Change the color of the neighboring lines to red
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1.position, p2.position]);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                scene.add(line);
            }
        }
    }
}

function applyWindForce() {
    for (const particle of particles) {
        if (!particle.pinned) {
            particle.position.add(windForce.clone().multiplyScalar(windStrength));
        }
    }
}

function applyWeightForce() {
    // Apply weight force to the center particle
    const centerX = Math.floor(segmentsX / 2);
    const centerY = Math.floor(segmentsY / 2);
    const centerParticle = particles[centerY * (segmentsX + 1) + centerX];
    centerParticle.position.add(weightForce.clone().multiplyScalar(0.1));
}

// Function to download the scene as a JPG
function downloadSceneAsJPG() {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'scene.jpg';
    link.click();
}

// Load font and create text
const loader1 = new FontLoader();
loader1.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textGeometry = new TextGeometry('Max Dufner\nengineer, artist, designer', {
        font: font,
        size: 0.5,
        height: 0.1,
        curveSegments: 1,
        bevelEnabled: false
    });
    const textMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(-5, 6, 0); // Adjust position as needed
    scene.add(textMesh);
});

// Load font and create text
const loader = new FontLoader();
loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textGeometry = new TextGeometry('Projects', {
        font: font,
        size: 1,
        height: 0.1,
        curveSegments: 1,
        bevelEnabled: false
    });
    const textMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(-1, -1, 2); // Adjust position as needed
    scene.add(textMesh);

    // Create a larger invisible box around the text
    const boxGeometry = new THREE.BoxGeometry(5, 1, 0.5); // Adjust size as needed
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, visible: true, transparent: true, opacity: 0 });
    const selectionBox = new THREE.Mesh(boxGeometry, boxMaterial);
    selectionBox.position.set(1.5, -.5, 2); // Adjust position as needed
    scene.add(selectionBox);

    // Add event listener for hover and click
    function handlePointerEvent(event) {
        const mouse = new THREE.Vector2();
        if (event.touches) {
            mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
        } else {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        }
    
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
    
        const intersects = raycaster.intersectObject(selectionBox);
        if (intersects.length > 0) {
            textMesh.material.color.set(0x9cc7e4); // Change color on hover
            document.body.style.cursor = 'pointer'; // Change cursor to pointer
        } else {
            textMesh.material.color.set(0xff0000); // Reset color
            document.body.style.cursor = 'default'; // Reset cursor
        }
    }

    // Add event listeners for hover and click
    window.addEventListener('mousemove', handlePointerEvent);
    window.addEventListener('touchmove', handlePointerEvent);

    window.addEventListener('click', function (event) {
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(selectionBox);
        if (intersects.length > 0) {
            window.location.href = '/projects.html'; // Open projects page
        }
    });

    window.addEventListener('touchstart', function (event) {
        const mouse = new THREE.Vector2();
        mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(selectionBox);
        if (intersects.length > 0) {
            window.location.href = '/projects.html'; // Open projects page
        }
    });
});

// Contact me text
const loader3 = new FontLoader();
loader3.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textGeometry = new TextGeometry('Contact me at mail@max-dufner.me', {
        font: font,
        size: 0.4,
        height: 0.1,
        curveSegments: 1,
        bevelEnabled: false
    });
    const textMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(-5, -5, 0); // Adjust position as needed
    textMesh.rotation.z = Math.PI / 2; // Rotate 90 degrees
    scene.add(textMesh);

    // Create a larger invisible box around the "Contact Me" text
    const boxGeometryContact = new THREE.BoxGeometry(7.75, 0.5, 0.5); // Adjust size as needed
    const boxMaterialContact = new THREE.MeshBasicMaterial({ color: 0x000000, visible: true, transparent: true, opacity: 0 });
    const selectionBoxContact = new THREE.Mesh(boxGeometryContact, boxMaterialContact);
    selectionBoxContact.position.set(-4.5, -0.4, 2); 
    selectionBoxContact.rotation.z = Math.PI / 2; // Rotate 90 degrees
    scene.add(selectionBoxContact);

    window.addEventListener('touchstart', function (event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObject(selectionBox);
    if (intersects.length > 0) {
        window.location.href = '/projects.html'; // Open projects page
    }
    });
    
    // Add event listeners for "Contact Me" text
    window.addEventListener('mousemove', function (event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersectsContact = raycaster.intersectObject(selectionBoxContact);
    if (intersectsContact.length > 0) {
        textMesh.material.color.set(0x9cc7e4); // Change color on hover
        document.body.style.cursor = 'pointer'; // Change cursor to pointer
    } else {
        textMesh.material.color.set(0xff0000); // Reset color
        document.body.style.cursor = 'default'; // Reset cursor
    }
    });
    
    window.addEventListener('click', function (event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersectsContact = raycaster.intersectObject(selectionBoxContact);
    if (intersectsContact.length > 0) {
        window.location.href = 'mailto:mail@max-dufner.me'; // Open email client
    }
    });
    
    window.addEventListener('touchstart', function (event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersectsContact = raycaster.intersectObject(selectionBoxContact);
    if (intersectsContact.length > 0) {
        window.location.href = 'mailto:mail@max-dufner.me'; // Open email client
    }
    });
});

function simulate(timeStep) {
    applyWindForce();
    applyWeightForce();

    for (const particle of particles) {
        if (!particle.pinned) {
            const temp = particle.position.clone();
            particle.position.add(particle.position.clone().sub(particle.previous).multiplyScalar(0.95)).add(gravity.clone().multiplyScalar(timeStep * timeStep));
            particle.previous.copy(temp);
        }
    }

    for (let i = 0; i < constraintIterations; i++) {
        for (const constraint of constraints) {
            const [p1, p2, restDistance] = constraint;
            const delta = p2.position.clone().sub(p1.position);
            const deltaLength = delta.length();
            const difference = (deltaLength - restDistance) / deltaLength;
            const correction = delta.multiplyScalar(0.5 * difference);
            if (!p1.pinned) p1.position.add(correction);
            if (!p2.pinned) p2.position.sub(correction);
        }
    }

    for (let i = 0; i < particles.length; i++) {
        clothGeometry.attributes.position.setXYZ(i, particles[i].position.x, particles[i].position.y, particles[i].position.z);
    }
    clothGeometry.attributes.position.needsUpdate = true;
}

// Handle window resize
window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    if (isDrawing) {
        removeIntersectedConstraints();
    }
    simulate(0.016);
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('mousedown', onMouseDown, false);
window.addEventListener('mouseup', onMouseUp, false);
window.addEventListener('keydown', onKeyDown, false);

animate();