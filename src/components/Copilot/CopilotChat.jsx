import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaPaperPlane, FaRobot, FaUser } from 'react-icons/fa';

export default function CopilotChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content:
        "Bonjour ! Je suis votre assistant IA SBI. Je peux vous aider à analyser vos données financières, répondre à vos questions comptables et vous fournir des insights. Comment puis-je vous aider ?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // TODO: Appeler l'API IA
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content:
            "Cette fonctionnalité nécessite la configuration d'un fournisseur IA dans **Paramètres > Configuration IA**. Une fois configuré, je pourrai analyser vos données financières et répondre à vos questions.",
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="d-flex align-items-start gap-2 mb-1">
              {msg.role === 'assistant' ? (
                <FaRobot className="text-primary mt-1" />
              ) : (
                <FaUser className="text-secondary mt-1" />
              )}
              <small className="text-muted fw-medium">
                {msg.role === 'assistant' ? 'Assistant IA' : 'Vous'}
              </small>
            </div>
            <div className="message-bubble">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message assistant">
            <div className="message-bubble">
              <div className="d-flex align-items-center gap-2">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                <span className="text-muted">Réflexion en cours...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <div className="input-group">
          <textarea
            className="form-control"
            placeholder="Posez votre question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ resize: 'none' }}
          />
          <button
            className="btn btn-primary d-flex align-items-center gap-1"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}
