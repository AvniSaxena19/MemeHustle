import React, { useState, useEffect, useRef } from 'react';
import { Upload, TrendingUp, Zap, DollarSign, Heart, MessageCircle, Users, Terminal, Cpu, Eye, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';



const CyberpunkMemeMarketplace = () => {
  const [memes, setMemes] = useState([]);
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [currentUser, setCurrentUser] = useState('neon_hacker');
  const [users, setUsers] = useState({});
  const [bids, setBids] = useState([]);
  const [newMeme, setNewMeme] = useState({
    title: '',
    image_url: '',
    tags: '',
    overlay_text: '',
    overlay_position: 'bottom'
  });
  const [bidAmount, setBidAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [terminalText, setTerminalText] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    const pollForUpdates = async () => {
      try {
        const response = await fetch(`${API_URL}/api/memes`);
        const newMemes = await response.json();

        if (newMemes.length > memes.length) {
          const latestMeme = newMemes[0];
          if (latestMeme.created_at && new Date(latestMeme.created_at).getTime() > lastUpdateTime) {
            showTerminalMessage(`NEW MEME DETECTED: ${latestMeme.title}`);
            setLastUpdateTime(Date.now());
          }
        }

        setMemes(newMemes);
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    };

    intervalRef.current = setInterval(pollForUpdates, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [memes.length, lastUpdateTime]);

  useEffect(() => {
    fetchMemes();
    fetchUsers();
  }, []);

  useEffect(() => {
    let bidInterval;
    if (selectedMeme) {
      fetchBids(selectedMeme.id);
      bidInterval = setInterval(() => {
        fetchBids(selectedMeme.id);
      }, 2000);
    }

    return () => {
      if (bidInterval) {
        clearInterval(bidInterval);
      }
    };
  }, [selectedMeme]);

  const showTerminalMessage = (message) => {
    setShowTerminal(true);
    setTerminalText('');
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < message.length) {
        setTerminalText(prev => prev + message[index]);
        index++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => setShowTerminal(false), 3000);
      }
    }, 50);
  };

  const fetchMemes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/memes`);
      const data = await response.json();
      setMemes(data);
    } catch (error) {
      console.error('Error fetching memes:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchBids = async (memeId) => {
    try {
      const response = await fetch(`${API_URL}/api/memes/${memeId}/bids`);
      const data = await response.json();
      setBids(data);
    } catch (error) {
      console.error('Error fetching bids:', error);
    }
  };

  const createMeme = async () => {
    if (!newMeme.title || !newMeme.image_url) return;

    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/memes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMeme,
          tags: newMeme.tags.split(',').map(tag => tag.trim()),
          owner_id: users[currentUser]?.id
        })
      });

      if (response.ok) {
        setNewMeme({
          title: '',
          image_url: '',
          tags: '',
          overlay_text: '',
          overlay_position: 'bottom'
        });
        showTerminalMessage('MEME UPLOADED TO THE MATRIX');
        setTimeout(fetchMemes, 500);
      }
    } catch (error) {
      console.error('Error creating meme:', error);
    }
    setIsCreating(false);
  };

  const voteMeme = async (memeId, voteType) => {
    try {
      await fetch(`${API_URL}/api/memes/${memeId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_type: voteType,
          user_id: users[currentUser]?.id
        })
      });
      showTerminalMessage(`VOTE ${voteType.toUpperCase()} REGISTERED`);
      setTimeout(fetchMemes, 500);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const placeBid = async () => {
    if (!bidAmount || !selectedMeme) return;

    try {
      const response = await fetch(`${API_URL}/api/memes/${selectedMeme.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: users[currentUser]?.id,
          credits: parseInt(bidAmount)
        })
      });

      if (response.ok) {
        setBidAmount('');
        showTerminalMessage(`BID PLACED: ${bidAmount} CREDITS`);
        setTimeout(() => fetchBids(selectedMeme.id), 500);
      }
    } catch (error) {
      console.error('Error placing bid:', error);
    }
  };

  const selectMeme = (meme) => {
    setSelectedMeme(meme);
    fetchBids(meme.id);
  };

  const renderMemeImage = (meme) => {
    const hasOverlay = meme.overlay_text && meme.overlay_text.trim() !== '';

    return (
      <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
        {meme.image_url ? (
          <>
            <img
              src={meme.image_url}
              alt={meme.title}
              className="max-w-full max-h-full object-contain hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTRweCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPklNQUdFIEVSUk9SPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
            {hasOverlay && (
              <div className={`absolute w-full px-4 py-2 text-white font-bold text-center 
                ${meme.overlay_position === 'top' ? 'top-0 bg-gradient-to-b from-black/90 to-transparent' :
                  meme.overlay_position === 'middle' ? 'top-1/2 transform -translate-y-1/2 bg-black/70' :
                    'bottom-0 bg-gradient-to-t from-black/90 to-transparent'}`}
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {meme.overlay_text}
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-600 text-center">
            <Upload className="w-16 h-16 mx-auto mb-2" />
            <p>No image</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
      <div className="fixed inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-black"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500 rounded-full blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {showTerminal && (
        <div className="fixed top-4 right-4 bg-black border border-green-400 p-4 rounded z-50 shadow-lg shadow-green-400/50">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-4 h-4" />
            <span className="text-xs">SYSTEM.LOG</span>
          </div>
          <div className="text-sm">
            &gt; {terminalText}
            <span className="animate-pulse">█</span>
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-pulse"></div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">
            NeuroMeme Exchange
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-6">
            Trade memes in the digital underground • AI-powered • Real-time chaos
          </p>

          <div className="flex justify-center items-center gap-4 mb-6">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <select
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              className="bg-gray-900 border border-cyan-400 text-cyan-400 px-4 py-2 rounded focus:border-pink-400 focus:outline-none hover:bg-gray-800 transition-colors"
            >
              {Object.entries(users).map(([key, user]) => (
                <option key={key} value={key}>
                  {user.name} ({user.credits} credits)
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-purple-500 rounded-lg p-6 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-purple-400 flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Upload Meme
              </h2>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Meme title..."
                  value={newMeme.title}
                  onChange={(e) => setNewMeme(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black border border-gray-600 text-green-400 px-4 py-2 rounded focus:border-purple-400 focus:outline-none hover:border-gray-500 transition-colors"
                />

                <input
                  type="url"
                  placeholder="Image URL..."
                  value={newMeme.image_url}
                  onChange={(e) => setNewMeme(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full bg-black border border-gray-600 text-green-400 px-4 py-2 rounded focus:border-purple-400 focus:outline-none hover:border-gray-500 transition-colors"
                />

                <input
                  type="text"
                  placeholder="Tags (doge, stonks, cyberpunk)..."
                  value={newMeme.tags}
                  onChange={(e) => setNewMeme(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full bg-black border border-gray-600 text-green-400 px-4 py-2 rounded focus:border-purple-400 focus:outline-none hover:border-gray-500 transition-colors"
                />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Type className="w-4 h-4" />
                    <span>Text Overlay</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Overlay text (optional)..."
                    value={newMeme.overlay_text}
                    onChange={(e) => setNewMeme(prev => ({ ...prev, overlay_text: e.target.value }))}
                    className="w-full bg-black border border-gray-600 text-green-400 px-4 py-2 rounded focus:border-purple-400 focus:outline-none hover:border-gray-500 transition-colors"
                  />
                  <div className="flex justify-between">
                    <button
                      onClick={() => setNewMeme(prev => ({ ...prev, overlay_position: 'top' }))}
                      className={`flex items-center gap-1 px-3 py-1 rounded ${newMeme.overlay_position === 'top' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      <AlignLeft className="w-4 h-4" />
                      Top
                    </button>
                    <button
                      onClick={() => setNewMeme(prev => ({ ...prev, overlay_position: 'middle' }))}
                      className={`flex items-center gap-1 px-3 py-1 rounded ${newMeme.overlay_position === 'middle' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      <AlignCenter className="w-4 h-4" />
                      Center
                    </button>
                    <button
                      onClick={() => setNewMeme(prev => ({ ...prev, overlay_position: 'bottom' }))}
                      className={`flex items-center gap-1 px-3 py-1 rounded ${newMeme.overlay_position === 'bottom' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                      <AlignRight className="w-4 h-4" />
                      Bottom
                    </button>
                  </div>
                </div>

                <button
                  onClick={createMeme}
                  disabled={isCreating || !newMeme.title || !newMeme.image_url}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCreating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      UPLOADING...
                    </div>
                  ) : 'HACK THE MATRIX'}
                </button>
              </div>
            </div>

            {selectedMeme && (
              <div className="bg-gray-900 border border-cyan-500 rounded-lg p-6 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow mt-6">
                <h3 className="text-lg md:text-xl font-bold mb-4 text-cyan-400 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Place Bid
                </h3>

                <div className="mb-3 text-sm text-gray-400">
                  Bidding on: <span className="text-white font-semibold">{selectedMeme.title}</span>
                </div>

                <div className="space-y-4">
                  <input
                    type="number"
                    placeholder="Credits to bid..."
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min="1"
                    max={users[currentUser]?.credits || 0}
                    className="w-full bg-black border border-gray-600 text-green-400 px-4 py-2 rounded focus:border-cyan-400 focus:outline-none hover:border-gray-500 transition-colors"
                  />

                  <button
                    onClick={placeBid}
                    disabled={!bidAmount || parseInt(bidAmount) > (users[currentUser]?.credits || 0)}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    BID NOW
                  </button>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2 text-gray-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    LIVE BIDS ({bids.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {bids.length > 0 ? (
                      bids.map((bid, index) => (
                        <div key={index} className="flex justify-between items-center bg-black p-2 rounded text-sm border border-gray-800 hover:border-gray-700 transition-colors">
                          <span className="text-cyan-400">{bid.user_name}</span>
                          <span className="text-yellow-400 font-bold">{bid.credits} credits</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-sm text-center py-4">
                        No bids yet. Be the first!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl md:text-2xl font-bold text-pink-400 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Trending Memes
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Eye className="w-4 h-4" />
                <span>{memes.length} memes in circulation</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {memes.map((meme) => (
                <div
                  key={meme.id}
                  className={`bg-gray-900 border rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:transform hover:scale-105 cursor-pointer ${selectedMeme?.id === meme.id
                    ? 'border-pink-500 shadow-pink-500/50 ring-2 ring-pink-500/30'
                    : 'border-gray-700 hover:border-purple-500 hover:shadow-purple-500/20'
                    }`}
                  onClick={() => selectMeme(meme)}
                >
                  {renderMemeImage(meme)}

                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-white truncate">{meme.title}</h3>

                    {meme.ai_caption && (
                      <p className="text-sm text-purple-400 mb-2 italic line-clamp-2">
                        🤖 "{meme.ai_caption}"
                      </p>
                    )}

                    {meme.vibe_analysis && (
                      <div className="text-xs text-cyan-400 mb-3 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {meme.vibe_analysis}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mb-3">
                      {meme.tags && meme.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-700 transition-colors">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            voteMeme(meme.id, 'up');
                          }}
                          className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors transform hover:scale-110"
                        >
                          <Heart className="w-4 h-4" />
                          {meme.upvotes || 0}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            voteMeme(meme.id, 'down');
                          }}
                          className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors transform hover:scale-110"
                        >
                          <MessageCircle className="w-4 h-4 rotate-180" />
                        </button>
                      </div>

                      <div className="text-xs text-gray-500">
                        {meme.created_at && new Date(meme.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {memes.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">
                  No memes found in the matrix...
                </div>
                <div className="text-gray-600 text-sm">
                  Upload the first meme to start the revolution!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="relative z-10 text-center py-8 text-gray-500 text-sm">
        <div className="border-t border-gray-800 pt-4">
          <p>Powered by AI • Built for the cyberpunk future • Trade at your own risk</p>
        </div>
      </footer>
    </div>
  );
};

export default CyberpunkMemeMarketplace;
