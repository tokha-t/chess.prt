import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

export default function ChessBoard({
  fen,
  orientation,
  onPieceDrop,
  onSquareClick,
  squareStyles,
  disabled = false,
}) {
  const frameRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(520);

  useEffect(() => {
    if (!frameRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      setBoardWidth(Math.max(280, Math.min(width, 620)));
    });
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="board-frame" ref={frameRef}>
      <Chessboard
        boardWidth={boardWidth}
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        arePiecesDraggable={!disabled}
        customSquareStyles={squareStyles}
        customBoardStyle={{
          borderRadius: "24px",
          boxShadow: "var(--board-shadow)",
        }}
        customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
        customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
      />
    </div>
  );
}
