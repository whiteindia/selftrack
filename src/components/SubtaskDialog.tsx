
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Subtask {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  estimated_duration: number | null;
  assignee_id: string | null;
  task_id: string;
}

interface SubtaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subtaskData: any) => void;
  taskId: string;
  editingSubtask?: Subtask | null;
  employees: Employee[];
  isLoading?: boolean;
}

const statusOptions = [
  'Not Started',
  'In Progress', 
  'Completed',
  'On Hold',
  'On-Head',
  'Targeted',
  'Imp'
];

const SubtaskDialog: React.FC<SubtaskDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  taskId,
  editingSubtask,
  employees,
  isLoading = false
}) => {
  const [subtaskData, setSubtaskData] = useState({
    name: '',
    status: 'Not Started',
    assignee_id: '',
    deadline: '',
    estimated_duration: ''
  });

  useEffect(() => {
    if (editingSubtask) {
      setSubtaskData({
        name: editingSubtask.name,
        status: editingSubtask.status,
        assignee_id: editingSubtask.assignee_id || '',
        deadline: editingSubtask.deadline || '',
        estimated_duration: editingSubtask.estimated_duration?.toString() || ''
      });
    } else {
      setSubtaskData({
        name: '',
        status: 'Not Started',
        assignee_id: '',
        deadline: '',
        estimated_duration: ''
      });
    }
  }, [editingSubtask, isOpen]);

  const handleSave = () => {
    if (!subtaskData.name.trim()) {
      return;
    }

    const dataToSave = {
      ...subtaskData,
      task_id: taskId,
      estimated_duration: subtaskData.estimated_duration ? parseFloat(subtaskData.estimated_duration) : null,
      deadline: subtaskData.deadline || null,
      assignee_id: subtaskData.assignee_id || null
    };

    onSave(dataToSave);
  };

  const handleClose = () => {
    setSubtaskData({
      name: '',
      status: 'Not Started',
      assignee_id: '',
      deadline: '',
      estimated_duration: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingSubtask ? 'Edit Subtask' : 'Create New Subtask'}</DialogTitle>
          <DialogDescription>
            {editingSubtask ? 'Update subtask details.' : 'Add a new subtask to this task.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subtask-name">Subtask Name</Label>
            <Input
              id="subtask-name"
              placeholder="Enter subtask name"
              value={subtaskData.name}
              onChange={(e) => setSubtaskData({ ...subtaskData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subtask-status">Status</Label>
            <Select 
              value={subtaskData.status} 
              onValueChange={(value) => setSubtaskData({ ...subtaskData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subtask-assignee">Assignee</Label>
            <Select 
              value={subtaskData.assignee_id} 
              onValueChange={(value) => setSubtaskData({ ...subtaskData, assignee_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtask-deadline">Deadline</Label>
              <Input
                id="subtask-deadline"
                type="date"
                value={subtaskData.deadline}
                onChange={(e) => setSubtaskData({ ...subtaskData, deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtask-estimated-duration">Estimated Hours</Label>
              <Input
                id="subtask-estimated-duration"
                type="number"
                step="0.5"
                value={subtaskData.estimated_duration}
                onChange={(e) => setSubtaskData({ ...subtaskData, estimated_duration: e.target.value })}
                placeholder="0.0"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isLoading || !subtaskData.name.trim()}
            >
              {isLoading ? (editingSubtask ? 'Updating...' : 'Creating...') : (editingSubtask ? 'Update Subtask' : 'Create Subtask')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubtaskDialog;
