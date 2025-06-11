import { Button } from './ui/button';

interface ChatButton {
  label: string;
  value: string;
}

interface MessageWithButtonsProps {
  content: string;
  buttons?: ChatButton[];
  onButtonClick: (value: string, originalMessage: string) => void;
}

export function MessageWithButtons({ content, buttons, onButtonClick }: MessageWithButtonsProps) {
  if (!buttons || buttons.length === 0) {
    return <div className="text-sm">{content}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm">{content}</div>
      <div className="flex gap-2">
        {buttons.map((button, index) => (
          <Button
            key={index}
            variant={button.value === 'yes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onButtonClick(button.value, content)}
            className="text-xs px-3 py-1"
          >
            {button.label}
          </Button>
        ))}
      </div>
    </div>
  );
} 