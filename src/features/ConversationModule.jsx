
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, RotateCcw } from 'lucide-react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { ConversationEngine, toPinyin, comparePinyin } from '../services/conversationEngine';
import { judgeGrammar } from '../services/llmJudge';
import { padariaScenario } from '../data/scenarios/padaria';
import RoughCharacter from '../components/RoughCharacter';

export default function ConversationModule() {
  const [engine, setEngine] = useState(null);
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLLMLoading, setIsLLMLoading] = useState(false);
  const [isNpcSpeaking, setIsNpcSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const { isListening, transcript, fullTranscript, error, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // Initialize engine on mount
  useEffect(() => {
    const newEngine = new ConversationEngine(padariaScenario);
    newEngine.restart();
    setEngine(newEngine);
    setHistory([...newEngine.history]);
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Função para tocar o áudio em mandarim e sincronizar a animação da boca
  const playNpcAudio = (textZh) => {
    if (!textZh) return;
    
    // Cancela áudios anteriores se o usuário enviar mensagens rápido demais
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textZh);
    utterance.lang = 'zh-CN'; // Define a voz para Mandarim
    utterance.rate = 0.85;    // Um pouco mais lento para facilitar a compreensão

    // Quando o áudio começar, o personagem abre a boca
    utterance.onstart = () => {
      setIsNpcSpeaking(true);
    };

    // Quando o áudio terminar, o personagem fecha a boca (idle)
    utterance.onend = () => {
      setIsNpcSpeaking(false);
    };

    // Tratamento de erro (caso o áudio falhe, não deixa a boca travada aberta)
    utterance.onerror = () => setIsNpcSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Handle sending a message
  const handleSend = async (text) => {
    if (!engine || !text.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const userText = text.trim();
      const result = engine.processInput(userText);
      setHistory([...engine.history]);
      
      // If there's pending LLM feedback, process it first, then play audio
      if (result.pendingFeedback && engine.pendingLLMFeedback) {
        setIsLLMLoading(true);
        const { userInput, expected } = engine.pendingLLMFeedback;
        const feedback = await judgeGrammar(userInput, expected);
        engine.applyLLMFeedback(feedback);
        setHistory([...engine.history]);
        // Toca o áudio do NPC após o feedback ser exibido
        const lastNpcMessage = [...engine.history].reverse().find(m => m.role === 'npc');
        if (lastNpcMessage && lastNpcMessage.textZh) {
          playNpcAudio(lastNpcMessage.textZh);
        }
        setIsLLMLoading(false);
      } else {
        // No pending feedback, play audio immediately
        if (result.node && result.node.npcTextZh) {
          playNpcAudio(result.node.npcTextZh);
        }
      }
    } catch (err) {
      console.error('Error processing input:', err);
      setIsLLMLoading(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toca o áudio de saudação quando o módulo inicializar
  useEffect(() => {
    if (engine && engine.currentNode && engine.currentNode.npcTextZh) {
      playNpcAudio(engine.currentNode.npcTextZh);
    }
  }, [engine]);

  // Handle stopping listening stop
  const handleStopListening = () => {
    stopListening();
    if (transcript.trim()) {
      handleSend(transcript);
    }
  };

  // Handle restart conversation
  const handleRestart = () => {
    if (!engine) return;
    engine.restart();
    setHistory([...engine.history]);
    setTextInput('');
  };

  return (
    <div className="flex flex-col h-full bg-ink-950">
      {/* Área do Cenário / Personagem */}
      <div className="h-64 bg-ink-900 border-b border-white/10 flex items-center justify-center relative overflow-hidden">
        <div className="w-48 h-56">
          {padariaScenario.npcSchema && (
            <RoughCharacter schema={padariaScenario.npcSchema} isSpeaking={isNpcSpeaking} />
          )}
        </div>
        
        {/* Balão flutuante do NPC (A caixinha) - mostrando a última mensagem */}
        {isNpcSpeaking && (
          <div className="absolute top-8 right-1/4 bg-white text-ink-900 p-3 rounded-2xl rounded-bl-sm shadow-xl max-w-xs">
            {history.filter(m => m.role === 'npc').length > 0 && (
              <p className="font-chinese text-xl">
                {[...history].reverse().find(m => m.role === 'npc')?.textZh}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-ink-900">
        <div>
          <h2 className="text-xl font-bold text-white">
            {padariaScenario.title}
          </h2>
          <p className="text-sm text-ink-400">
            {padariaScenario.titleZh}
          </p>
        </div>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-ink-300 hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={16} />
          Reiniciar
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.map((msg, idx) => (
          <div
            key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-vermillion-600 text-white rounded-tr-sm'
                  : msg.role === 'system'
                  ? 'bg-ink-700 text-ink-100 rounded-tl-sm'
                  : 'bg-ink-800 text-ink-100 rounded-tl-sm'
              }`}
            >
              {msg.textZh && (
                <div className="text-lg mb-1">{msg.textZh}</div>
              )}
              {msg.pinyin && (
                <div className="text-sm opacity-80">{msg.pinyin}</div>
              )}
              {msg.text && (
                <div className="text-sm opacity-70 mt-1">{msg.text}</div>
              )}
              {msg.type === 'hint' && (
                <div className="text-xs mt-2 text-yellow-300 italic">💡 {msg.text}</div>
              )}
              {msg.type === 'llm_feedback' && (
                <div className="mt-3 pt-3 border-t border-white/20 space-y-3">
                  {/* Explanation */}
                  <div className="text-sm font-bold text-azure-300">{msg.generalFeedback}</div>
                  {msg.explanation && (
                    <div className="text-sm text-ink-200">{msg.explanation}</div>
                  )}
                  
                  {/* Original vs Corrected Phrases */}
                  <div className="grid grid-cols-1 gap-2">
                    {/* Original Phrase */}
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="text-xs text-ink-400 mb-1">Sua frase:</div>
                      <div className="text-lg">
                        {msg.highlightedOriginal && msg.highlightedOriginal.length > 0 ? (
                          msg.highlightedOriginal.map((charObj, idx) => {
                            let colorClass = 'text-ink-100';
                            if (charObj.type === 'error') colorClass = 'text-vermillion-400 font-bold';
                            if (charObj.type === 'missing') colorClass = 'text-yellow-400 italic opacity-50';
                            if (charObj.type === 'extra') colorClass = 'text-orange-400 line-through';
                            return (
                              <span key={idx} className={colorClass}>
                                {charObj.char}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-ink-100">{msg.originalPhrase}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Corrected Phrase */}
                    {!msg.correct && (
                      <div className="bg-black/20 rounded-lg p-3">
                        <div className="text-xs text-ink-400 mb-1">Frase correta:</div>
                        <div className="text-lg">
                          {msg.highlightedCorrected && msg.highlightedCorrected.length > 0 ? (
                            msg.highlightedCorrected.map((charObj, idx) => {
                              let colorClass = 'text-ink-100';
                              if (charObj.type === 'fixed') colorClass = 'text-jade-400 font-bold';
                              return (
                                <span key={idx} className={colorClass}>
                                  {charObj.char}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-ink-100">{msg.correctedPhrase}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  
                </div>
              )}
            </div>
          </div>
        ))}
        {/* LLM Loading Indicator */}
        {isLLMLoading && (
          <div className="flex justify-start">
            <div className="bg-ink-800 text-ink-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="text-sm">Analisando</span>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-azure-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-azure-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-azure-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-ink-900">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={textInput || fullTranscript}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isListening) {
                  handleSend(textInput || transcript);
                }
              }}
              placeholder="Digite sua frase em chinês..."
              className="w-full px-4 py-3 bg-ink-800 border border-white/10 rounded-2xl text-white placeholder:text-ink-400 focus:outline-none focus:border-vermillion-500/50"
            />
          </div>

          {/* Mic Button */}
          <button
            onMouseDown={startListening}
            onMouseUp={handleStopListening}
            onMouseLeave={handleStopListening}
            onTouchStart={startListening}
            onTouchEnd={handleStopListening}
            className={`p-3 rounded-full transition-all ${
              isListening
                ? 'bg-vermillion-500 animate-pulse'
                : 'bg-vermillion-500/20 hover:bg-vermillion-500/30'
            }`}
          >
            <Mic className={isListening ? 'text-white' : 'text-vermillion-400'} size={24} />
          </button>

          {/* Send Button */}
          <button
            onClick={() => handleSend(textInput || transcript)}
            disabled={isProcessing || (!textInput.trim() && !transcript.trim())}
            className="p-3 rounded-full bg-vermillion-500 hover:bg-vermillion-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            <Send size={20} />
          </button>
        </div>
        {error && <div className="mt-2 text-sm text-vermillion-400">{error}</div>}
      </div>
    </div>
  );
}
