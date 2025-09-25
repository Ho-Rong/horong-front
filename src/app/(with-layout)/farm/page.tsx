"use client";

import { useEffect, useRef, useState } from "react";
import * as styles from "./styles.css";
import Character from "./components/Character";
import { Button } from "@vapor-ui/core";
import { useRouter } from "next/navigation";

// API 응답 타입 정의
interface UserData {
  name: string;
  ownCharacters: number[];
}

interface PhysicsBallInstance {
  element: HTMLElement;
  index: number;
  isDragging: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  bounce: number;
  friction: number;
  radius: number;
  mouseOffset: { x: number; y: number };
  container: HTMLElement;

  bindEvents(): void;
  startDrag(e: MouseEvent | Touch): void;
  drag(e: MouseEvent | Touch): void;
  stopDrag(): void;
  update(): void;
  checkBounds(): void;
  checkCollisions(): void;
  updatePosition(): void;
}

class PhysicsBall implements PhysicsBallInstance {
  element: HTMLElement;
  index: number;
  isDragging: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  bounce: number;
  friction: number;
  radius: number;
  mouseOffset: { x: number; y: number };
  balls: PhysicsBall[];
  container: HTMLElement;

  rotation: number;
  angularVelocity: number;

  constructor(
    element: HTMLElement,
    index: number,
    balls: PhysicsBall[],
    container: HTMLElement
  ) {
    this.element = element;
    this.index = index;
    this.balls = balls;
    this.container = container;
    this.isDragging = false;

    const containerRect = container.getBoundingClientRect();
    this.x = Math.random() * (containerRect.width - 150);
    this.y = Math.random() * (containerRect.height - 150);

    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.05;
    this.bounce = 0.4;
    this.friction = 0.998;
    this.radius = 50;
    this.mouseOffset = { x: 0, y: 0 };

    this.rotation = ((index * 23) % 181) - 90;
    this.angularVelocity = 0;

    this.updatePosition();
    this.bindEvents();
  }

  bindEvents() {
    this.element.addEventListener("mousedown", (e) => this.startDrag(e));
    document.addEventListener("mousemove", (e) => this.drag(e));
    document.addEventListener("mouseup", () => this.stopDrag());

    this.element.addEventListener("touchstart", (e) =>
      this.startDrag(e.touches[0])
    );
    document.addEventListener("touchmove", (e) => this.drag(e.touches[0]));
    document.addEventListener("touchend", () => this.stopDrag());
  }

  startDrag(e: MouseEvent | Touch) {
    this.isDragging = true;
    this.vx = 0;
    this.vy = 0;

    const rect = this.element.getBoundingClientRect();
    this.mouseOffset.x = e.clientX - rect.left;
    this.mouseOffset.y = e.clientY - rect.top;

    this.element.style.zIndex = "1000";
  }

  drag(e: MouseEvent | Touch) {
    if (!this.isDragging) return;

    const containerRect = this.container.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const relativeY = e.clientY - containerRect.top;

    const newX = Math.max(
      0,
      Math.min(relativeX - this.mouseOffset.x, containerRect.width - 150)
    );
    const newY = Math.max(
      0,
      Math.min(relativeY - this.mouseOffset.y, containerRect.height - 150)
    );

    const deltaX = newX - this.x;
    const deltaY = newY - this.y;

    this.vx = deltaX * 0.3;
    this.vy = deltaY * 0.3;

    this.angularVelocity = deltaX * 0.1;

    this.x = newX;
    this.y = newY;

    this.updatePosition();
  }

  stopDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      this.element.style.zIndex = "auto";

      this.vx *= 0.5;
      this.vy *= 0.5;
    }
  }

  update() {
    if (!this.isDragging) {
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= this.friction;

      this.rotation += this.angularVelocity;
      this.angularVelocity *= 0.98;

      this.checkBounds();
    }

    for (let i = 0; i < 3; i++) {
      this.checkCollisions();
    }

    this.updatePosition();
  }

  checkBounds() {
    const containerRect = this.container.getBoundingClientRect();

    if (this.x < 0) {
      this.x = 0;
      this.vx = -this.vx * this.bounce;
    }
    if (this.x > containerRect.width - 150) {
      this.x = containerRect.width - 150;
      this.vx = -this.vx * this.bounce;
    }

    if (this.y > containerRect.height - 150) {
      this.y = containerRect.height - 150;
      this.vy = -this.vy * this.bounce;

      if (Math.abs(this.vy) < 1) {
        this.vy = 0;
      }
    }

    if (this.y < 0) {
      this.y = 0;
      this.vy = -this.vy * this.bounce;
    }
  }

  checkCollisions() {
    this.balls.forEach((otherBall, index) => {
      if (index === this.index) return;

      const dx = this.x - otherBall.x;
      const dy = this.y - otherBall.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = this.radius + otherBall.radius;

      if (distance < minDistance && distance > 0) {
        const overlap = minDistance - distance;
        const angle = Math.atan2(dy, dx);

        const separationForce = overlap * 0.6;

        this.x += Math.cos(angle) * separationForce;
        this.y += Math.sin(angle) * separationForce;
        otherBall.x -= Math.cos(angle) * separationForce;
        otherBall.y -= Math.sin(angle) * separationForce;

        const slideForce = 0.05;
        const perpAngle = angle + Math.PI / 2;

        this.vy += slideForce;
        otherBall.vy += slideForce;

        this.vx += Math.cos(perpAngle) * slideForce * (Math.random() - 0.5);
        otherBall.vx +=
          Math.cos(perpAngle) * slideForce * (Math.random() - 0.5);

        const containerRect = this.container.getBoundingClientRect();
        this.x = Math.max(0, Math.min(this.x, containerRect.width - 150));
        this.y = Math.max(0, Math.min(this.y, containerRect.height - 150));
        otherBall.x = Math.max(
          0,
          Math.min(otherBall.x, containerRect.width - 150)
        );
        otherBall.y = Math.max(
          0,
          Math.min(otherBall.y, containerRect.height - 150)
        );

        if (!this.isDragging && !otherBall.isDragging) {
          const tempVx = this.vx;
          const tempVy = this.vy;

          this.vx = otherBall.vx * 0.6;
          this.vy = otherBall.vy * 0.6;
          otherBall.vx = tempVx * 0.6;
          otherBall.vy = tempVy * 0.6;
        } else if (this.isDragging) {
          const pushForce = 6 + overlap * 0.3;
          otherBall.vx += Math.cos(angle + Math.PI) * pushForce;
          otherBall.vy += Math.sin(angle + Math.PI) * pushForce;
        }

        const rotationImpact = overlap * 0.2;
        this.angularVelocity += rotationImpact * (Math.random() - 0.5);
        otherBall.angularVelocity += rotationImpact * (Math.random() - 0.5);
      }
    });
  }

  updatePosition() {
    this.element.style.left = this.x + "px";
    this.element.style.top = this.y + "px";

    this.element.style.transform = `rotate(${this.rotation}deg)`;
  }
}

// API 호출 함수들
const fetchUserData = async (): Promise<UserData | null> => {
  try {
    const response = await fetch("/api/user", {
      method: "GET",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: UserData = await response.json();
    return data;
  } catch (error) {
    console.error("API 호출 실패:", error);
    return null;
  }
};

// 다른 방식의 API 호출 (axios 스타일, 하지만 fetch 기반)
const apiClient = {
  get: async (url: string) => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API 요청 실패:", error);
      throw error;
    }
  },
};

export default function PhysicsBallsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const router = useRouter();

  const handleGoToHome = () => {
    router.push("/home"); // /farm 페이지로 이동
  };

  // API 데이터를 위한 상태
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 호출 함수
  const handleFetchUserData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchUserData();
      setUserData(data);
      console.log("사용자 데이터:", data);
    } catch (err) {
      setError("데이터를 불러오는데 실패했습니다.");
      console.error("데이터 로드 에러:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 자동으로 API 호출 (선택사항)
  useEffect(() => {
    // 자동 로드를 원한다면 주석 해제
    // handleFetchUserData();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const ballElements = containerRef.current.querySelectorAll(
      "[data-ball]"
    ) as NodeListOf<HTMLElement>;
    const balls: PhysicsBall[] = [];

    ballElements.forEach((element, index) => {
      balls.push(new PhysicsBall(element, index, balls, containerRef.current!));
    });

    const animate = () => {
      balls.forEach((ball) => ball.update());
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      balls.forEach((ball) => {
        if (ball.x > containerRect.width - 150) {
          ball.x = containerRect.width - 150;
        }
        if (ball.y > containerRect.height - 150) {
          ball.y = containerRect.height - 150;
        }
      });
    };

    const handleDoubleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const ballIndex = target.dataset.ball;
      if (ballIndex) {
        const ball = balls[parseInt(ballIndex)];
        ball.vy = -15 - Math.random() * 10;
        ball.vx = (Math.random() - 0.5) * 10;
      }
    };

    window.addEventListener("resize", handleResize);
    ballElements.forEach((element) => {
      element.addEventListener("dblclick", handleDoubleClick);
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", handleResize);
      ballElements.forEach((element) => {
        element.removeEventListener("dblclick", handleDoubleClick);
      });
    };
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <Button onClick={handleGoToHome}>홈으로 가기</Button>
      <div className={styles.ground} />

      {/* API 테스트 UI */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          background: "rgba(255,255,255,0.9)",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "14px",
        }}
      >
        <button
          onClick={handleFetchUserData}
          disabled={isLoading}
          style={{
            padding: "5px 10px",
            marginBottom: "10px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "로딩 중..." : "API 호출 테스트"}
        </button>

        {error && (
          <div style={{ color: "red", marginBottom: "10px" }}>
            에러: {error}
          </div>
        )}

        {userData && (
          <div>
            <strong>사용자 정보:</strong>
            <div>이름: {userData.name}</div>
            <div>보유 캐릭터: [{userData.ownCharacters.join(", ")}]</div>
          </div>
        )}
      </div>

      {/* 기존 캐릭터들 - userData가 있다면 보유 캐릭터만 표시하거나 다르게 스타일링 가능 */}
      <Character characterId={1} dataBall="0" characterIndex={0} />
      <Character characterId={2} dataBall="1" characterIndex={1} />
      <Character characterId={3} dataBall="2" characterIndex={2} />
      <Character characterId={4} dataBall="3" characterIndex={3} />
      <Character characterId={5} dataBall="4" characterIndex={4} />
      <Character characterId={6} dataBall="5" characterIndex={5} />
      <Character characterId={7} dataBall="6" characterIndex={6} />
      <Character characterId={8} dataBall="7" characterIndex={7} />
    </div>
  );
}
