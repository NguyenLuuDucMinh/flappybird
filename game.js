import * as THREE from 'three';

// --- Khởi tạo cơ bản ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Bầu trời xanh

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;
camera.position.y = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Ánh sáng ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- Các hằng số và biến trò chơi ---
// Điều chỉnh các giá trị này để cân bằng game tốt hơn với deltaTime
const gravity = 30; // Tăng giá trị vì giờ nó nhân với deltaTime (thường nhỏ)
const flapStrength = 8; // Tăng giá trị vì giờ nó được áp dụng tức thời
const pipeSpeed = 10; // Tăng giá trị vì giờ nó nhân với deltaTime

let birdSpeedY = 0;
const pipeGap = 4;
const pipeWidth = 2;
const pipeSpawnDistance = 30; // Có thể cần điều chỉnh khoảng cách này
let lastPipeX = 20;
let score = 0;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
const pipes = [];
const clock = new THREE.Clock();

// --- Đối tượng Chim ---
const birdGeometry = new THREE.BoxGeometry(1, 1, 1);
const birdMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
const bird = new THREE.Mesh(birdGeometry, birdMaterial);
bird.position.x = -5;
scene.add(bird);

// --- Mặt đất ---
const groundGeometry = new THREE.PlaneGeometry(100, 10);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -5;
scene.add(ground);

// --- UI Elements ---
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');

// --- Hàm Tạo Ống ---
function createPipePair(xPosition) {
    const worldHeight = 15; // Chiều cao ước lượng của khu vực chơi game (y từ -5 đến 10)
    const minY = -3; // Vị trí Y thấp nhất cho tâm khoảng trống
    const maxY = 5;  // Vị trí Y cao nhất cho tâm khoảng trống
    const gapCenterY = Math.random() * (maxY - minY) + minY; // Vị trí Y ngẫu nhiên hơn

    // Ống trên
    // Chiều cao = (Biên trên của vùng chơi) - (Tâm khoảng trống + nửa khoảng trống)
    const pipeTopHeight = (worldHeight / 2 + camera.position.y - (ground.position.y+0.5)) - (gapCenterY + pipeGap / 2) ; // Tính chiều cao từ mặt đất giả định lên đỉnh
     const pipeTopGeometry = new THREE.BoxGeometry(pipeWidth, Math.max(0.1, pipeTopHeight), pipeWidth); // Đảm bảo chiều cao > 0
    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const pipeTop = new THREE.Mesh(pipeTopGeometry, pipeMaterial);
    // Vị trí Y = (Tâm khoảng trống + nửa khoảng trống) + (nửa chiều cao ống trên)
    pipeTop.position.set(xPosition, gapCenterY + pipeGap / 2 + pipeTopHeight / 2, 0);
    scene.add(pipeTop);

    // Ống dưới
    // Chiều cao = (Tâm khoảng trống - nửa khoảng trống) - (Biên dưới của vùng chơi = mặt đất)
    const pipeBottomHeight = (gapCenterY - pipeGap / 2) - ground.position.y;
    const pipeBottomGeometry = new THREE.BoxGeometry(pipeWidth, Math.max(0.1, pipeBottomHeight), pipeWidth); // Đảm bảo chiều cao > 0
    const pipeBottom = new THREE.Mesh(pipeBottomGeometry, pipeMaterial);
     // Vị trí Y = (Tâm khoảng trống - nửa khoảng trống) - (nửa chiều cao ống dưới)
    pipeBottom.position.set(xPosition, gapCenterY - pipeGap / 2 - pipeBottomHeight / 2, 0);
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
    bird.position.y = 1; // Vị trí bắt đầu Y
    birdSpeedY = 0; // Reset vận tốc
    score = 0;
    scoreElement.innerText = `Score: ${score}`;
    gameOverElement.style.display = 'none';
    gameOverElement.innerHTML = `GAME OVER!<span>Nhấn Space/Click để chơi lại</span>`; // Đặt lại text GameOver

    // Xóa tất cả ống cũ
    pipes.forEach(pair => {
        scene.remove(pair.top);
        scene.remove(pair.bottom);
        if (pair.top.geometry) pair.top.geometry.dispose();
        if (pair.bottom.geometry) pair.bottom.geometry.dispose();
    });
    pipes.length = 0; // Làm rỗng mảng

    // Tạo lại ống ban đầu
    lastPipeX = 20; // Đặt lại vị trí X của ống đầu tiên
    createPipePair(lastPipeX);
    createPipePair(lastPipeX + pipeSpawnDistance);
    createPipePair(lastPipeX + 2 * pipeSpawnDistance);

    gameState = 'playing'; // Chuyển trạng thái sang đang chơi
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

// --- Phát hiện Va chạm (AABB) ---
function checkCollisions() {
    const birdBox = new THREE.Box3().setFromObject(bird);

    // Va chạm với mặt đất/trần nhà (giới hạn Y)
    if (bird.position.y < ground.position.y + 0.5 || bird.position.y > 12) { // +0.5 để chạm đúng "bề mặt" ground
       return true;
    }

    // Va chạm với ống
    for (const pair of pipes) {
        // Chỉ kiểm tra va chạm với các ống ở gần chim theo trục X để tối ưu
        if (pair.top.position.x + pipeWidth / 2 > bird.position.x - 0.5 &&
            pair.top.position.x - pipeWidth / 2 < bird.position.x + 0.5) {

            const topPipeBox = new THREE.Box3().setFromObject(pair.top);
            const bottomPipeBox = new THREE.Box3().setFromObject(pair.bottom);

            if (birdBox.intersectsBox(topPipeBox) || birdBox.intersectsBox(bottomPipeBox)) {
                return true; // Va chạm!
            }
        }
    }
    return false; // Không va chạm
}


// --- Xử lý Input ---
function handleInput(event) {
    // Chỉ xử lý khi không phải đang gõ vào input nào đó (phòng trường hợp có thêm UI)
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    if (event.code === 'Space' || event.type === 'mousedown' || event.type === 'touchstart') {
        event.preventDefault(); // Ngăn hành vi mặc định (cuộn trang, chọn text)

        if (gameState === 'playing') {
            birdSpeedY = flapStrength; // Áp dụng lực nhảy (sẽ được dùng trong frame tiếp theo)
        } else if (gameState === 'gameOver' || gameState === 'start') {
            resetGame(); // Gọi hàm reset để bắt đầu/chơi lại
        }
    }
}

document.addEventListener('keydown', handleInput);
document.addEventListener('mousedown', handleInput);
document.addEventListener('touchstart', handleInput);


// --- Vòng lặp Animation ---
function animate() {
    requestAnimationFrame(animate); // Lập lịch cho frame tiếp theo

    const deltaTime = clock.getDelta(); // Lấy thời gian từ frame trước

    if (gameState === 'playing') {
        // --- Cập nhật Vật lý Chim (Sử dụng deltaTime) ---
        birdSpeedY -= gravity * deltaTime; // Trọng lực theo thời gian
        bird.position.y += birdSpeedY * deltaTime; // Cập nhật vị trí theo thời gian

        // --- Cập nhật Ống (Sử dụng deltaTime) ---
        const pipesToRemove = [];
        let newPipeNeeded = false;
        let furthestPipeX = -Infinity; // Tìm ống xa nhất bên phải

        pipes.forEach((pair, index) => {
            pair.top.position.x -= pipeSpeed * deltaTime; // Di chuyển ống theo thời gian
            pair.bottom.position.x -= pipeSpeed * deltaTime;

            // Cập nhật ống xa nhất
            if (pair.top.position.x > furthestPipeX) {
                furthestPipeX = pair.top.position.x;
            }

            // Tính điểm
            if (!pair.scored && pair.top.position.x < bird.position.x - pipeWidth / 2) { // Chim đã vượt qua hoàn toàn ống
                pair.scored = true;
                updateScore();
            }

            // Kiểm tra ống cần xóa (đi quá xa về bên trái)
            if (pair.top.position.x < -camera.position.z - pipeWidth) { // Ra khỏi tầm nhìn camera
                pipesToRemove.push(index);
            }
        });

         // Kiểm tra nếu cần tạo ống mới dựa trên vị trí ống xa nhất
         // Tạo ống mới khi ống xa nhất còn cách một khoảng `pipeSpawnDistance` so với điểm spawn ban đầu (ví dụ: 20)
         if (pipes.length === 0 || furthestPipeX < lastPipeX - pipeSpawnDistance + 5) { // +5 để tránh tạo quá sát nhau
             lastPipeX = furthestPipeX <= -Infinity ? 20 : furthestPipeX + pipeSpawnDistance; // Nếu ko có ống thì bắt đầu ở 20
             createPipePair(lastPipeX);
         }


        // Xóa ống cũ (lặp ngược)
        for (let i = pipesToRemove.length - 1; i >= 0; i--) {
            const indexToRemove = pipesToRemove[i];
            scene.remove(pipes[indexToRemove].top);
            scene.remove(pipes[indexToRemove].bottom);
            if (pipes[indexToRemove].top.geometry) pipes[indexToRemove].top.geometry.dispose();
            if (pipes[indexToRemove].bottom.geometry) pipes[indexToRemove].bottom.geometry.dispose();
            pipes.splice(indexToRemove, 1);
        }

        // --- Kiểm tra Va chạm ---
        if (checkCollisions()) {
            endGame();
        }

    } else if (gameState === 'start') {
         // Hiển thị thông báo bắt đầu
         gameOverElement.innerHTML = `FLAPPY BIRD 3D<span>Nhấn Space/Click để bắt đầu</span>`;
         gameOverElement.style.display = 'block';
         // Có thể thêm hiệu ứng nhẹ cho chim chờ ở màn hình start
         bird.position.y = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.1; // Chim nhấp nhô nhẹ
    } else if (gameState === 'gameOver') {
        // Có thể thêm hiệu ứng khi game over, ví dụ chim rơi hẳn xuống
        if (bird.position.y > ground.position.y + 0.5) {
             birdSpeedY -= gravity * deltaTime * 0.5; // Rơi chậm hơn khi game over
             bird.position.y += birdSpeedY * deltaTime;
        } else {
            bird.position.y = ground.position.y + 0.5; // Nằm trên mặt đất
        }
    }

    // --- Render Scene ---
    renderer.render(scene, camera);
}

// --- Xử lý thay đổi kích thước cửa sổ ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Bắt đầu vòng lặp ---
// Tạo vài ống ban đầu khi bắt đầu
createPipePair(lastPipeX);
createPipePair(lastPipeX + pipeSpawnDistance);
createPipePair(lastPipeX + 2 * pipeSpawnDistance);
// Khởi tạo vị trí chim ban đầu
bird.position.y = 1;
animate(); // Bắt đầu vòng lặp game