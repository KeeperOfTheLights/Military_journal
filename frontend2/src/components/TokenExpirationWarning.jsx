import { useAuth } from '../context/AuthContext';
import { Clock, RefreshCw, LogOut, X } from 'lucide-react';
import './TokenExpirationWarning.css';

export default function TokenExpirationWarning() {
  const { showExpirationWarning, expiresIn, refreshToken, logout, dismissWarning } = useAuth();

  if (!showExpirationWarning) return null;

  const handleRefresh = async () => {
    await refreshToken();
  };

  return (
    <div className="token-warning-overlay">
      <div className="token-warning-modal">
        <button className="warning-close" onClick={dismissWarning} title="Закрыть">
          <X size={20} />
        </button>
        
        <div className="warning-icon">
          <Clock size={48} />
        </div>
        
        <h2>Сессия истекает</h2>
        
        <p className="warning-message">
          Ваша сессия истекает через <strong>{expiresIn} мин.</strong>
          <br />
          Продлите сессию, чтобы продолжить работу.
        </p>
        
        <div className="warning-actions">
          <button className="btn btn-primary" onClick={handleRefresh}>
            <RefreshCw size={18} />
            Продлить сессию
          </button>
          
          <button className="btn btn-outline" onClick={logout}>
            <LogOut size={18} />
            Выйти
          </button>
        </div>
        
        <p className="warning-note">
          Если вы не предпримете действий, вы будете автоматически выведены из системы.
        </p>
      </div>
    </div>
  );
}
