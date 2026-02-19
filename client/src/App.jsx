import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import LandingPage from './components/LandingPage.jsx';
import { sendMessage, getTopics, addTopic } from './api.js';

export default function App() {
    const [topics, setTopics] = useState([]);
    const [duration, setDuration] = useState(3);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('guardrail');
    const [activeTopic, setActiveTopic] = useState(null);

    // Auth state
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('ai_tutor_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('signin');

    // Load topics on mount
    useEffect(() => {
        (async () => {
            try {
                const data = await getTopics();
                setTopics(data);
            } catch (err) {
                console.error('Failed to load topics:', err);
            }
        })();
    }, []);

    // Auto-scroll on new messages
    useEffect(() => {
        const area = document.getElementById('messages-area');
        if (area) area.scrollTop = area.scrollHeight;
    }, [messages, loading]);

    // Simulate agent step progression while loading
    useEffect(() => {
        if (!loading) return;
        setLoadingStep('guardrail');
        const t1 = setTimeout(() => setLoadingStep('teacher'), 3000);
        const t2 = setTimeout(() => setLoadingStep('media'), 15000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [loading]);

    const handleSend = async (query) => {
        const userMsg = {
            role: 'user',
            content: query,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const result = await sendMessage(query, duration);
            const assistantMsg = {
                role: 'assistant',
                rejected: result.rejected,
                rejectionReason: result.rejectionReason,
                markdown: result.markdown,
                imageUrl: result.imageUrl,
                audioText: result.audioText,
                mediaFailed: result.mediaFailed,
                topic: result.topic,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                rejected: true,
                rejectionReason: `❌ Connection error: ${err.response?.data?.error || err.message || 'Please try again.'}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleTopicClick = (topic) => {
        setActiveTopic(topic.id);
        handleSend(`Explain ${topic.name}`);
    };

    const handleAddTopic = async (name, description) => {
        try {
            const newTopic = await addTopic(name, description);
            setTopics(prev => [...prev, newTopic]);
        } catch (err) {
            console.error('Failed to add topic:', err);
        }
    };

    const handleGoHome = () => {
        setMessages([]);
        setActiveTopic(null);
        setLoading(false);
    };

    // Auth handlers
    const handleSignIn = (name, email) => {
        const userData = { name, email, avatar: name.charAt(0).toUpperCase() };
        setUser(userData);
        localStorage.setItem('ai_tutor_user', JSON.stringify(userData));
        setShowAuthModal(false);
    };

    const handleSignOut = () => {
        setUser(null);
        localStorage.removeItem('ai_tutor_user');
        setMessages([]);
        setActiveTopic(null);
    };

    const openAuth = (mode) => {
        setAuthMode(mode);
        setShowAuthModal(true);
    };

    // ─── If not signed in, show landing page ───
    if (!user) {
        return (
            <>
                <LandingPage
                    onSignIn={() => openAuth('signin')}
                    onSignUp={() => openAuth('signup')}
                />
                {showAuthModal && (
                    <AuthModal
                        mode={authMode}
                        onClose={() => setShowAuthModal(false)}
                        onSubmit={handleSignIn}
                        onSwitchMode={(m) => setAuthMode(m)}
                    />
                )}
            </>
        );
    }

    // ─── Signed in: show the full tutor app ───
    return (
        <div className="app">
            <Sidebar
                topics={topics}
                duration={duration}
                onDurationChange={setDuration}
                onTopicClick={handleTopicClick}
                onAddTopic={handleAddTopic}
                activeTopic={activeTopic}
                onGoHome={handleGoHome}
            />
            <ChatPanel
                messages={messages}
                loading={loading}
                loadingStep={loadingStep}
                onSend={handleSend}
                user={user}
                onSignIn={() => openAuth('signin')}
                onSignUp={() => openAuth('signup')}
                onSignOut={handleSignOut}
                onGoHome={handleGoHome}
            />
            {showAuthModal && (
                <AuthModal
                    mode={authMode}
                    onClose={() => setShowAuthModal(false)}
                    onSubmit={handleSignIn}
                    onSwitchMode={(m) => setAuthMode(m)}
                />
            )}
        </div>
    );
}

/* ─── Auth Modal ─── */
function AuthModal({ mode, onClose, onSubmit, onSwitchMode }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email.trim() && password.trim()) {
            onSubmit(
                mode === 'signup' ? name.trim() || 'Student' : email.split('@')[0],
                email.trim()
            );
        }
    };

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={e => e.stopPropagation()}>
                <button className="auth-close" onClick={onClose}>✕</button>
                <div className="auth-header">
                    <div className="auth-logo">🎓</div>
                    <h2>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>Cantilever AI Tutor — Placement Preparation</p>
                </div>
                <form className="auth-form" onSubmit={handleSubmit}>
                    {mode === 'signup' && (
                        <div className="auth-field">
                            <label>Full Name</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="auth-field">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoFocus={mode === 'signin'}
                            required
                        />
                    </div>
                    <div className="auth-field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="auth-submit">
                        {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>
                <div className="auth-switch">
                    {mode === 'signin' ? (
                        <span>Don't have an account? <button onClick={() => onSwitchMode('signup')}>Sign Up</button></span>
                    ) : (
                        <span>Already have an account? <button onClick={() => onSwitchMode('signin')}>Sign In</button></span>
                    )}
                </div>
            </div>
        </div>
    );
}
