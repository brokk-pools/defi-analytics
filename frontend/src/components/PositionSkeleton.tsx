// React import removed - not needed with new JSX transform

interface PositionSkeletonProps {
  count?: number;
}

export default function PositionSkeleton({ count = 3 }: PositionSkeletonProps) {
  return (
    <div className="positions-container">
      <div className="skeleton skeleton-title" style={{ width: '60%', margin: '0 auto var(--spacing-lg) auto' }} />
      <div className="skeleton skeleton-text" style={{ width: '40%', margin: '0 auto var(--spacing-lg) auto' }} />
      
      <div className="positions-grid">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="position-card">
            <div className="position-header">
              <div>
                <div className="skeleton skeleton-text" style={{ width: '120px', marginBottom: 'var(--spacing-xs)' }} />
                <div className="skeleton skeleton-text" style={{ width: '200px' }} />
              </div>
              <div className="skeleton skeleton-badge" style={{ width: '80px', height: '24px' }} />
            </div>
            
            <div className="position-details">
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="skeleton skeleton-label" style={{ width: '80px', marginBottom: 'var(--spacing-xs)' }} />
                  <div className="skeleton skeleton-text" style={{ width: '100px' }} />
                </div>
                <div className="detail-item">
                  <div className="skeleton skeleton-label" style={{ width: '80px', marginBottom: 'var(--spacing-xs)' }} />
                  <div className="skeleton skeleton-text" style={{ width: '100px' }} />
                </div>
              </div>
              
              <div className="detail-item">
                <div className="skeleton skeleton-label" style={{ width: '60px', marginBottom: 'var(--spacing-xs)' }} />
                <div className="skeleton skeleton-text" style={{ width: '150px' }} />
              </div>
              
              <div className="detail-item">
                <div className="skeleton skeleton-label" style={{ width: '90px', marginBottom: 'var(--spacing-xs)' }} />
                <div className="skeleton skeleton-text" style={{ width: '120px' }} />
              </div>
              
              <div className="fees-section">
                <div className="skeleton skeleton-text" style={{ width: '120px', marginBottom: 'var(--spacing-sm)' }} />
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="skeleton skeleton-label" style={{ width: '40px', marginBottom: 'var(--spacing-xs)' }} />
                    <div className="skeleton skeleton-text" style={{ width: '80px' }} />
                  </div>
                  <div className="detail-item">
                    <div className="skeleton skeleton-label" style={{ width: '50px', marginBottom: 'var(--spacing-xs)' }} />
                    <div className="skeleton skeleton-text" style={{ width: '80px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}