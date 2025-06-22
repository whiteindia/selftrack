
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logActivity, logTaskCreated } from '@/utils/activityLogger';
import { useAuth } from '@/contexts/AuthContext';

const ActivityFeedTest = () => {
  const { user } = useAuth();

  const handleTestActivity = async () => {
    if (!user) return;
    
    // Test logging different types of activities
    await logActivity({
      action_type: 'test_action',
      entity_type: 'system',
      entity_name: 'Test Entity',
      description: 'This is a test activity entry',
      comment: 'Testing the activity feed functionality'
    });

    // Note: User login activities are no longer logged
    
    // Simulate task creation
    await logTaskCreated('Sample Task', 'test-task-id', 'Sample Project');
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Activity Feed Test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Click the button below to create test activities in the activity feed.
        </p>
        <Button onClick={handleTestActivity}>
          Create Test Activities
        </Button>
      </CardContent>
    </Card>
  );
};

export default ActivityFeedTest;
