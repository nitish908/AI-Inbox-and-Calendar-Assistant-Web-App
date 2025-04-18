import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserPreferences {
  replyTone: string;
  autoSuggestReplies: boolean;
  dailyBriefing: boolean;
}

interface AISettingsProps {
  preferences: UserPreferences;
}

export default function AISettings({ preferences }: AISettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserPreferences>(preferences);
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserPreferences>) => {
      const response = await apiRequest('POST', '/api/user/preferences', newSettings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your AI assistant settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToneChange = (value: string) => {
    const newSettings = { ...settings, replyTone: value };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  const handleCheckboxChange = (field: keyof Omit<UserPreferences, 'replyTone'>, checked: boolean) => {
    const newSettings = { ...settings, [field]: checked };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <CardHeader className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <h3 className="text-lg font-medium text-neutral-800">AI Assistant Settings</h3>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="reply-tone" className="block text-sm font-medium text-neutral-700">Reply Tone</Label>
            <Select value={settings.replyTone} onValueChange={handleToneChange}>
              <SelectTrigger id="reply-tone" className="mt-1 w-full">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="auto-suggest" 
              checked={settings.autoSuggestReplies}
              onCheckedChange={(checked) => handleCheckboxChange('autoSuggestReplies', checked as boolean)}
            />
            <Label htmlFor="auto-suggest" className="text-sm text-neutral-700">Auto-suggest replies</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="daily-briefing" 
              checked={settings.dailyBriefing}
              onCheckedChange={(checked) => handleCheckboxChange('dailyBriefing', checked as boolean)}
            />
            <Label htmlFor="daily-briefing" className="text-sm text-neutral-700">Daily briefing notifications</Label>
          </div>
          
          <div className="pt-3">
            <Link href="/settings">
              <a className="text-sm font-medium text-primary hover:text-indigo-800">
                View all settings
              </a>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
