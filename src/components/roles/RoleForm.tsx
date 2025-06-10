
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RoleFormProps {
  roleName: string;
  onRoleNameChange: (name: string) => void;
  isEditing: boolean;
  getValidRole: (inputRole: string) => string;
}

const RoleForm: React.FC<RoleFormProps> = ({ 
  roleName, 
  onRoleNameChange, 
  isEditing, 
  getValidRole 
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="roleName">Role Name</Label>
      <Input
        id="roleName"
        value={roleName}
        onChange={(e) => onRoleNameChange(e.target.value)}
        placeholder="Enter any role name (e.g., sales-executive, admin, custom-role)"
        disabled={isEditing}
        className={isEditing ? "bg-gray-100" : ""}
      />
      <p className="text-sm text-gray-500">
        You can create any role name. Common examples: admin, manager, teamlead, associate, accountant, sales-executive, etc.
      </p>
      {roleName && !isEditing && (
        <p className="text-sm text-blue-600">
          "{roleName}" will be standardized as: "{getValidRole(roleName)}"
        </p>
      )}
    </div>
  );
};

export default RoleForm;
