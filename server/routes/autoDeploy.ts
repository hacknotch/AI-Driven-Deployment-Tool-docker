import { Router } from 'express';
import { performFullyAutomatedDeployment, handleGitHubWebhook, AutoDeployConfig } from '../lib/autoDeployService';

const router = Router();

/**
 * 🚀 FULLY AUTOMATED DEPLOYMENT ENDPOINT
 * POST /api/auto-deploy
 * 
 * This endpoint handles the complete automation pipeline:
 * 1. AI Analysis & Error Detection
 * 2. Missing File Generation (LangChain + GPT-4o Mini)
 * 3. Dockerfile Generation
 * 4. Docker Image Building
 * 5. Docker Hub Push
 * 6. Automatic Deployment
 */
router.post('/auto-deploy', async (req, res) => {
  try {
    const {
      repoUrl,
      githubToken,
      dockerHubUsername,
      dockerHubPassword,
      autoBuild = true,
      autoPush = true,
      autoDeploy = true,
      deploymentTarget = 'dockerhub',
      deploymentConfig = {}
    } = req.body;

    console.log('🚀 Starting FULLY AUTOMATED deployment...');
    console.log(`🔗 Repository: ${repoUrl}`);
    console.log(`🎯 Deployment Target: ${deploymentTarget}`);

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Repository URL is required'
      });
    }

    const config: AutoDeployConfig = {
      repoUrl,
      githubToken,
      dockerHubUsername,
      dockerHubPassword,
      autoBuild,
      autoPush,
      autoDeploy,
      deploymentTarget,
      deploymentConfig
    };

    // Start the fully automated deployment
    const result = await performFullyAutomatedDeployment(config);

    if (result.success) {
      console.log('🎉 FULLY AUTOMATED DEPLOYMENT COMPLETED SUCCESSFULLY!');
      console.log(`📊 Deployment ID: ${result.deploymentId}`);
      console.log(`🐳 Image: ${result.imageName}`);
      console.log(`🌐 URL: ${result.deploymentUrl}`);
    } else {
      console.log('❌ FULLY AUTOMATED DEPLOYMENT FAILED');
      console.log(`❌ Error: ${result.error}`);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Auto-deploy endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Auto-deployment failed',
      deploymentId: `error-${Date.now()}`,
      logs: [],
      steps: {
        analysis: false,
        fileGeneration: false,
        dockerBuild: false,
        dockerPush: false,
        deployment: false
      }
    });
  }
});

/**
 * 🔄 GITHUB WEBHOOK ENDPOINT
 * POST /api/auto-deploy/webhook
 * 
 * This endpoint receives GitHub push events and automatically triggers deployment
 * No manual intervention required - just push to main/master branch!
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const event = req.headers['x-github-event'];

    console.log(`🔄 GitHub webhook received: ${event}`);

    if (event === 'push') {
      const result = await handleGitHubWebhook(payload);
      
      if (result.success) {
        console.log('🎉 Automatic deployment from webhook completed!');
      } else {
        console.log('⚠️ Automatic deployment from webhook failed:', result.error);
      }

      res.json(result);
    } else {
      res.json({
        success: true,
        message: `Webhook event '${event}' received but not processed`,
        deploymentId: `webhook-${Date.now()}`
      });
    }

  } catch (error) {
    console.error('❌ Webhook endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    });
  }
});

/**
 * 📊 DEPLOYMENT STATUS ENDPOINT
 * GET /api/auto-deploy/status/:deploymentId
 * 
 * Check the status of a running deployment
 */
router.get('/status/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    
    // In a real implementation, you'd store deployment status in a database
    // For now, return a placeholder response
    res.json({
      deploymentId,
      status: 'completed',
      message: 'Deployment status tracking not yet implemented',
      logs: [
        'This endpoint will provide real-time deployment status',
        'Integration with database storage coming soon'
      ]
    });

  } catch (error) {
    console.error('❌ Status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed'
    });
  }
});

/**
 * 🧪 TEST ENDPOINT
 * GET /api/auto-deploy/test
 * 
 * Test the auto-deployment system with a sample repository
 */
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing auto-deployment system...');

    const testConfig: AutoDeployConfig = {
      repoUrl: 'https://github.com/octocat/Hello-World', // GitHub's sample repo
      autoBuild: true,
      autoPush: false, // Don't actually push for testing
      autoDeploy: false, // Don't actually deploy for testing
      deploymentTarget: 'dockerhub'
    };

    const result = await performFullyAutomatedDeployment(testConfig);

    res.json({
      success: true,
      message: 'Auto-deployment test completed',
      testResult: result
    });

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    });
  }
});

/**
 * 📋 DEPLOYMENT HISTORY ENDPOINT
 * GET /api/auto-deploy/history
 * 
 * Get a list of all deployments
 */
router.get('/history', async (req, res) => {
  try {
    // In a real implementation, you'd query a database
    // For now, return a placeholder response
    res.json({
      success: true,
      deployments: [
        {
          deploymentId: 'deploy-1234567890-abc123',
          repoUrl: 'https://github.com/user/repo',
          status: 'completed',
          imageName: 'user/repo:latest',
          deploymentUrl: 'https://hub.docker.com/r/user/repo',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        }
      ],
      message: 'Deployment history tracking not yet implemented'
    });

  } catch (error) {
    console.error('❌ History endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'History retrieval failed'
    });
  }
});

export default router;
