const express = require('express');
const axios = require('axios');
const path = require('path');

let server;

function startServer() {
    const app = express();
    const port = 3000;

    // Serve static files from the 'public' directory
    app.use(express.static(path.join(__dirname, 'public')));

    app.use(express.json());

    app.post('/shareboost', async (req, res) => {
        try {
            const { accessToken, shareUrl, shareAmount } = req.body;

            if (!accessToken || !shareUrl || isNaN(shareAmount) || shareAmount <= 0) {
                return res.status(400).send('Invalid input data.');
            }

            const timeInterval = 500;
            const deleteAfter = 60 * 60;

            let sharedCount = 0;
            let timer = null;

            async function sharePost() {
                try {
                    const response = await axios.post(
                        `https://graph.facebook.com/me/feed?access_token=${accessToken}&fields=id&limit=1&published=0`,
                        {
                            link: shareUrl,
                            privacy: { value: 'SELF' },
                            no_story: true,
                        },
                        {
                            muteHttpExceptions: true,
                            headers: {
                                authority: 'graph.facebook.com',
                                'cache-control': 'max-age=0',
                                'sec-ch-ua-mobile': '?0',
                                'user-agent':
                                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36',
                            },
                            method: 'post',
                        }
                    );

                    sharedCount++;
                    const postId = response?.data?.id;

                    console.log(`Post shared: ${sharedCount}`);
                    console.log(`Post ID: ${postId || 'Unknown'}`);

                    if (sharedCount === shareAmount) {
                        clearInterval(timer);
                        console.log('Finished sharing posts.');

                        if (postId) {
                            setTimeout(() => {
                                deletePost(postId);
                            }, deleteAfter * 1000);
                        }

                        res.send('DONE SHARING');
                    }
                } catch (error) {
                    console.error('Failed to share post:', error.response.data);

                    // Check if the error message matches the specific error
                    if (error.response.data && error.response.data === '{') {
                        console.log('Restarting server due to specific error...');
                        restartServer();
                    }
                }
            }

            async function deletePost(postId) {
                try {
                    await axios.delete(`https://graph.facebook.com/${postId}?access_token=${accessToken}`);
                    console.log(`Post deleted: ${postId}`);
                } catch (error) {
                    console.error('Failed to delete post:', error.response.data);
                }
            }

            timer = setInterval(sharePost, timeInterval);

            setTimeout(() => {
                clearInterval(timer);
                console.log('Loop stopped.');
            }, shareAmount * timeInterval);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('An error occurred.');
        }
    });

    server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

function restartServer() {
    if (server) {
        server.close(() => {
            console.log('Server closed. Restarting...');
            startServer();
        });
    }
}

startServer();
