export function ErrorMessage({ children }: { children: string }) {
  return <div className="feedback feedback-error" role="alert">{children}</div>;
}

export function SuccessMessage({ children }: { children: string }) {
  return <div className="feedback feedback-success" role="status">{children}</div>;
}
