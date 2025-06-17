require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const cache = {
    leaderboard: null,
    lastLeaderboardUpdate: 0,
    aiResponses: new Map()
};

const MOCK_USERS = {
    'neon_hacker': { id: 1, name: 'Neon Hacker', credits: 1000 },
    'cyber_punk': { id: 2, name: 'Cyber Punk', credits: 850 },
    'matrix_lord': { id: 3, name: 'Matrix Lord', credits: 1200 },
    'glitch_master': { id: 4, name: 'Glitch Master', credits: 750 }
};

async function generateAICaption(tags) {
    const cacheKey = `caption_${tags.join('_')}`;

    if (cache.aiResponses.has(cacheKey)) {
        return cache.aiResponses.get(cacheKey);
    }

    try {
        const prompt = `Generate a funny, cyberpunk-style caption for a meme with these tags: ${tags.join(', ')}. Make it edgy, internet culture aware, and under 100 characters. Examples: "Doge hacks the matrix", "Stonks going to the digital moon", "Error 404: Chill not found"`;

        const result = await model.generateContent(prompt);
        const caption = result.response.text().trim();

        cache.aiResponses.set(cacheKey, caption);
        return caption;
    } catch (error) {
        console.error('Gemini API error:', error);
        const fallbacks = [
            "YOLO to the moon! 🚀",
            "Hack the planet, one meme at a time",
            "404: Normalcy not found",
            "Loading... cyberpunk vibes activated",
            "Glitch in the matrix detected"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

async function generateVibeAnalysis(tags, title) {
    const cacheKey = `vibe_${tags.join('_')}_${title}`;

    if (cache.aiResponses.has(cacheKey)) {
        return cache.aiResponses.get(cacheKey);
    }

    try {
        const prompt = `Analyze the vibe of this meme: Title: "${title}", Tags: ${tags.join(', ')}. Return a short cyberpunk-style vibe description (2-4 words). Examples: "Neon Crypto Chaos", "Retro Stonks Vibes", "Digital Rebellion Energy", "Matrix Glitch Mode"`;

        const result = await model.generateContent(prompt);
        const vibe = result.response.text().trim();

        cache.aiResponses.set(cacheKey, vibe);
        return vibe;
    } catch (error) {
        console.error('Gemini API error:', error);
        const fallbacks = [
            "Neon Crypto Chaos",
            "Digital Punk Energy",
            "Matrix Glitch Mode",
            "Cyber Stonks Vibes",
            "Retro Future Feels"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

app.get('/api/memes', async (req, res) => {
    try {
        const { data: memes, error } = await supabase
            .from('memes')
            .select('*')
            .order('upvotes', { ascending: false });

        if (error) throw error;

        res.json(memes);
    } catch (error) {
        console.error('Error fetching memes:', error);
        res.status(500).json({ error: 'Failed to fetch memes' });
    }
});

app.post('/api/memes', async (req, res) => {
    try {
        const { title, image_url, tags, owner_id, overlay_text, overlay_position } = req.body;

        const ai_caption = await generateAICaption(tags);
        const vibe_analysis = await generateVibeAnalysis(tags, title);

        const { data: meme, error } = await supabase
            .from('memes')
            .insert([{
                title,
                image_url,
                tags,
                owner_id,
                ai_caption,
                vibe_analysis,
                upvotes: 0,
                created_at: new Date(),
                overlay_text: overlay_text || null,
                overlay_position: overlay_position || 'bottom'
            }])
            .select()
            .single();

        if (error) throw error;

        io.emit('new_meme', meme);

        res.json(meme);
    } catch (error) {
        console.error('Error creating meme:', error);
        res.status(500).json({ error: 'Failed to create meme' });
    }
});

app.post('/api/memes/:id/vote', async (req, res) => {
    try {
        const { id } = req.params;
        const { vote_type, user_id } = req.body;

        const increment = vote_type === 'up' ? 1 : -1;

        const { data: currentMeme, error: fetchError } = await supabase
            .from('memes')
            .select('upvotes')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const newUpvotes = currentMeme.upvotes + increment;

        const { data: meme, error } = await supabase
            .from('memes')
            .update({ upvotes: newUpvotes })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        io.emit('vote_update', { meme_id: id, new_upvotes: meme.upvotes });

        res.json(meme);
    } catch (error) {
        console.error('Error voting on meme:', error);
        res.status(500).json({ error: 'Failed to vote on meme' });
    }
});

app.post('/api/memes/:id/bid', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, credits } = req.body;

        const { data: bid, error } = await supabase
            .from('bids')
            .insert([{
                meme_id: id,
                user_id,
                credits,
                created_at: new Date()
            }])
            .select()
            .single();

        if (error) throw error;

        const userName = Object.values(MOCK_USERS).find(u => u.id === user_id)?.name || 'Anonymous';

        io.emit('new_bid', {
            meme_id: id,
            bid: { ...bid, user_name: userName }
        });

        res.json(bid);
    } catch (error) {
        console.error('Error placing bid:', error);
        res.status(500).json({ error: 'Failed to place bid' });
    }
});

app.get('/api/memes/:id/bids', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: bids, error } = await supabase
            .from('bids')
            .select('*')
            .eq('meme_id', id)
            .order('credits', { ascending: false });

        if (error) throw error;

        const bidsWithUsers = bids.map(bid => ({
            ...bid,
            user_name: Object.values(MOCK_USERS).find(u => u.id === bid.user_id)?.name || 'Anonymous'
        }));

        res.json(bidsWithUsers);
    } catch (error) {
        console.error('Error fetching bids:', error);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const { top = 10 } = req.query;
        const now = Date.now();

        if (cache.leaderboard && (now - cache.lastLeaderboardUpdate) < 30000) {
            return res.json(cache.leaderboard.slice(0, parseInt(top)));
        }

        const { data: memes, error } = await supabase
            .from('memes')
            .select('*')
            .order('upvotes', { ascending: false })
            .limit(50);

        if (error) throw error;

        cache.leaderboard = memes;
        cache.lastLeaderboardUpdate = now;

        res.json(memes.slice(0, parseInt(top)));
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

app.get('/api/users', (req, res) => {
    res.json(MOCK_USERS);
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_meme_room', (memeId) => {
        socket.join(`meme_${memeId}`);
    });

    socket.on('leave_meme_room', (memeId) => {
        socket.leave(`meme_${memeId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Cyberpunk Meme Server running on port ${PORT}`);
    console.log(`💫 Neon lights activated, synthwave mode ON`);
});


