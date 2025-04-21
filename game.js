import * as THREE from 'three';
// import { GLTFLoader } from '...'; // Giữ lại nếu bạn đang dùng model chim .glb
// Hoặc xóa nếu bạn đang dùng chim tạo từ hình học cơ bản

// --- Khởi tạo cơ bản ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;
camera.position.y = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Ánh sáng ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// --- Các hằng số và biến trò chơi ---
const gravity = 30;
const flapStrength = 8;
const pipeSpeed = 10;

let birdSpeedY = 0;
const pipeGap = 4.5;
const pipeWidth = 2.5;
const pipeSpawnDistance = 30;
let lastPipeX = 20;
let score = 0;
let gameState = 'start'; // Hoặc 'loading' nếu dùng model .glb
const pipes = [];
const clock = new THREE.Clock();

// --- Đối tượng Chim (Giữ nguyên code tạo chim của bạn) ---
function createSimpleBird() {
    const birdGroup = new THREE.Group();
    const bodyRadius = 0.5;
    const bodyGeometry = new THREE.SphereGeometry(bodyRadius, 16, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    birdGroup.add(body);

    const headRadius = 0.3;
    const headGeometry = new THREE.SphereGeometry(headRadius, 12, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(bodyRadius * 0.8, bodyRadius * 0.3, 0);
    head.castShadow = true;
    birdGroup.add(head);

    const beakLength = 0.3;
    const beakRadius = 0.1;
    const beakGeometry = new THREE.ConeGeometry(beakRadius, beakLength, 8);
    const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(head.position.x + headRadius + beakLength * 0.4, head.position.y, 0);
    beak.rotation.z = -Math.PI / 2;
    beak.castShadow = true;
    birdGroup.add(beak);

    const eyeRadius = 0.06;
    const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeRight.position.set(head.position.x + headRadius * 0.5, head.position.y + headRadius * 0.2, headRadius * 0.7);
    birdGroup.add(eyeRight);

    birdGroup.position.set(-5, 1, 0);
    return birdGroup;
}
const bird = createSimpleBird();
scene.add(bird);
// --- Hết phần code chim ---

// --- Mặt đất ---
const groundGeometry = new THREE.PlaneGeometry(100, 20);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x964B00,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -5;
ground.receiveShadow = true;
scene.add(ground);

// --- UI Elements ---
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');

// --- Material cho Ống (Màu xanh lá cây đơn giản) ---
const pipeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2E8B57, // Màu SeaGreen (Bạn có thể đổi sang mã màu khác, vd: 0x00FF00 cho xanh lá cây sáng)
    // metalness: 0.1, // Tùy chỉnh nếu muốn
    // roughness: 0.7  // Tùy chỉnh nếu muốn
});


// --- Hàm Tạo Ống (Sử dụng Material màu xanh chung) ---
function createPipePair(xPosition) {
    const worldHeight = 15;
    const minY = -2.5;
    const maxY = 4.5;
    const gapCenterY = Math.random() * (maxY - minY) + minY;

    const pipeRadius = pipeWidth / 2;
    const pipeSegments = 20; // Độ mượt của trụ

    // --- Ống trên ---
    const pipeTopHeight = (worldHeight / 2 + camera.position.y - (ground.position.y + 0.5)) - (gapCenterY + pipeGap / 2);
    const pipeTopGeometry = new THREE.CylinderGeometry(pipeRadius, pipeRadius, Math.max(0.1, pipeTopHeight), pipeSegments);
    // Sử dụng trực tiếp pipeMaterial chung
    const pipeTop = new THREE.Mesh(pipeTopGeometry, pipeMaterial);
    pipeTop.position.set(xPosition, gapCenterY + pipeGap / 2 + pipeTopHeight / 2, 0);
    pipeTop.castShadow = true;
    pipeTop.receiveShadow = true;
    scene.add(pipeTop);

    // --- Ống dưới ---
    const pipeBottomHeight = (gapCenterY - pipeGap / 2) - ground.position.y;
    const pipeBottomGeometry = new THREE.CylinderGeometry(pipeRadius, pipeRadius, Math.max(0.1, pipeBottomHeight), pipeSegments);
    // Sử dụng trực tiếp pipeMaterial chung
    const pipeBottom = new THREE.Mesh(pipeBottomGeometry, pipeMaterial);
    pipeBottom.position.set(xPosition, gapCenterY - pipeGap / 2 - pipeBottomHeight / 2, 0);
    pipeBottom.castShadow = true;
    pipeBottom.receiveShadow = true;
    scene.add(pipeBottom);

    const pipePair = {
        top: pipeTop,
        bottom: pipeBottom,
        scored: false
    };
    pipes.push(pipePair);
    return pipePair;
}

// --- Hàm Đặt lại Trò chơi ---
function resetGame() {
    // Reset chim
    bird.position.y = 1;
    bird.position.x = -5;
    if(bird.rotation) bird.rotation.z = 0;
    birdSpeedY = 0;

    // Reset điểm, UI
    score = 0;
    scoreElement.innerText = `Score: ${score}`;
    gameOverElement.style.display = 'none';
    gameOverElement.innerHTML = `GAME OVER!<span>Nhấn Space/Click để chơi lại</span>`;

    // Xóa tất cả ống cũ
    pipes.forEach(pair => {
        scene.remove(pair.top);
        scene.remove(pair.bottom);
        // Chỉ cần giải phóng geometry vì material được dùng chung
        if (pair.top.geometry) pair.top.geometry.dispose();
        if (pair.bottom.geometry) pair.bottom.geometry.dispose();
    });
    pipes.length = 0; // Làm rỗng mảng

    // Tạo lại ống ban đầu
    lastPipeX = 20;
    createPipePair(lastPipeX);
    createPipePair(lastPipeX + pipeSpawnDistance);
    createPipePair(lastPipeX + 2 * pipeSpawnDistance);

    gameState = 'playing';
}

// --- Hàm Cập nhật Điểm ---
function updateScore() {
    score++;
    scoreElement.innerText = `Score: ${score}`;
}

// --- Hàm Kết thúc Game ---
function endGame() {
    gameState = 'gameOver';
    gameOverElement.style.display = 'block';
}

// --- Phát hiện Va chạm (Giữ nguyên) ---
function checkCollisions() {
    if (!bird) return false;
    const birdBox = new THREE.Box3().setFromObject(bird);

    if (birdBox.min.y < ground.position.y || birdBox.max.y > 12) {
       return true;
    }

    const pipeRadius = pipeWidth / 2;
    for (const pair of pipes) {
        if (birdBox.max.x > pair.top.position.x - pipeRadius &&
            birdBox.min.x < pair.top.position.x + pipeRadius) {

            const topPipeBox = new THREE.Box3().setFromObject(pair.top);
            const bottomPipeBox = new THREE.Box3().setFromObject(pair.bottom);

            if (birdBox.intersectsBox(topPipeBox) || birdBox.intersectsBox(bottomPipeBox)) {
                return true;
            }
        }
    }
    return false;
}

// --- Xử lý Input (Giữ nguyên) ---
function handleInput(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    if (!bird || (gameState === 'loading' && gameState !== 'start')) return;

    if (event.code === 'Space' || event.type === 'mousedown' || event.type === 'touchstart') {
        event.preventDefault();
        if (gameState === 'playing') {
            birdSpeedY = flapStrength;
            if (bird.rotation) bird.rotation.z = 0.3;
        } else if (gameState === 'gameOver' || gameState === 'start') {
            resetGame();
        }
    }
}
document.addEventListener('keydown', handleInput);
document.addEventListener('mousedown', handleInput);
document.addEventListener('touchstart', handleInput);

// --- Vòng lặp Animation (Giữ nguyên logic chính) ---
function animate() {
    requestAnimationFrame(animate);
    if (gameState === 'loading' || !bird) {
        renderer.render(scene, camera);
        return;
    }

    const deltaTime = clock.getDelta();

    if (gameState === 'playing') {
        // Cập nhật chim
        birdSpeedY -= gravity * deltaTime;
        bird.position.y += birdSpeedY * deltaTime;
        if (bird.rotation) {
            bird.rotation.z = Math.max(-Math.PI / 4, Math.min(Math.PI / 6, birdSpeedY * 0.05));
        }

        // Cập nhật ống
        const pipesToRemove = [];
        let furthestPipeX = -Infinity;
        pipes.forEach((pair, index) => {
            pair.top.position.x -= pipeSpeed * deltaTime;
            pair.bottom.position.x -= pipeSpeed * deltaTime;

            if (pair.top.position.x > furthestPipeX) {
                furthestPipeX = pair.top.position.x;
            }

            if (!pair.scored && pair.top.position.x < bird.position.x) {
                pair.scored = true;
                updateScore();
            }

            if (pair.top.position.x < -camera.position.z - pipeWidth) {
                pipesToRemove.push(index);
            }
        });

        // Tạo ống mới
         const spawnTriggerX = 10;
         if (pipes.length === 0 || furthestPipeX < spawnTriggerX) {
             let nextPipeX = (furthestPipeX <= -Infinity) ? 20 : furthestPipeX + pipeSpawnDistance;
             createPipePair(nextPipeX);
         }

        // Xóa ống cũ
        for (let i = pipesToRemove.length - 1; i >= 0; i--) {
             const indexToRemove = pipesToRemove[i];
             const pairToRemove = pipes[indexToRemove];
             scene.remove(pairToRemove.top);
             scene.remove(pairToRemove.bottom);
             // Chỉ cần giải phóng geometry
             if (pairToRemove.top.geometry) pairToRemove.top.geometry.dispose();
             if (pairToRemove.bottom.geometry) pairToRemove.bottom.geometry.dispose();
             pipes.splice(indexToRemove, 1);
        }

        // Kiểm tra va chạm
        if (checkCollisions()) {
            endGame();
        }

    } else if (gameState === 'start') {
         gameOverElement.innerHTML = `FLAPPY BIRD 3D<span>Nhấn Space/Click để bắt đầu</span>`;
         gameOverElement.style.display = 'block';
         bird.position.y = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.1;
         if(bird.rotation) bird.rotation.z = 0;

    } else if (gameState === 'gameOver') {
        const birdBox = new THREE.Box3().setFromObject(bird);
        const groundLevel = ground.position.y + (birdBox.max.y - birdBox.min.y) / 2;
         if (bird.position.y > groundLevel) {
             birdSpeedY -= gravity * deltaTime * 0.8;
             bird.position.y += birdSpeedY * deltaTime;
             if (bird.rotation) bird.rotation.z = Math.max(-Math.PI / 2, bird.rotation.z - deltaTime * 2);
         } else {
            bird.position.y = groundLevel;
            birdSpeedY = 0;
             if (bird.rotation) bird.rotation.z = -Math.PI / 2;
         }
    }

    renderer.render(scene, camera);
}

// --- Xử lý thay đổi kích thước cửa sổ (Giữ nguyên) ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Bắt đầu Game ---
function startGame() {
    createPipePair(lastPipeX);
    createPipePair(lastPipeX + pipeSpawnDistance);
    createPipePair(lastPipeX + 2 * pipeSpawnDistance);
    animate();
}

startGame(); // Gọi trực tiếp nếu không load model