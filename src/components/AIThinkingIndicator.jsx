export default function AIThinkingIndicator({ active }) {
  if (!active) return null;

  return (
    <div className="thinking-indicator" role="status">
      <span />
      <span />
      <span />
      AI is thinking...
    </div>
  );
}
