import CopilotChat from '../../components/Copilot/CopilotChat';
import { FaRobot } from 'react-icons/fa';

export default function AssistantPage() {
  return (
    <div>
      <div className="mb-3">
        <h4 className="fw-bold mb-1">
          <FaRobot className="me-2 text-primary" />
          Assistant IA
        </h4>
        <p className="text-muted mb-0 small">
          Interrogez vos données financières en langage naturel
        </p>
      </div>
      <CopilotChat />
    </div>
  );
}
