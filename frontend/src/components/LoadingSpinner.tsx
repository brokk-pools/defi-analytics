// React import removed - not needed with new JSX transform

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export default function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps) {
  const sizeMap = {
    small: '1rem',
    medium: '1.5rem',
    large: '2rem'
  };

  return (
    <div className="loading-container">
      <div 
        className="loading-spinner" 
        style={{ 
          width: sizeMap[size], 
          height: sizeMap[size] 
        }}
      />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}