import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FolderSearch } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'

interface CustomPathProps {
    value: string;
    onChange: (value: string) => void;
}

const CustomPath: React.FC<CustomPathProps> = ({ value, onChange }) => {


    const handleOpenDialog = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
            });

            if (selected && typeof selected === 'string') {
                onChange(selected);
            }
        } catch (err) {
            console.error("Failed to open directory dialog", err);
        }
    }

    return (
        <div className="flex w-full items-center space-x-2">
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter custom path..."
            />
            <Button variant="outline" size="icon" onClick={handleOpenDialog}>
                <FolderSearch className="h-4 w-4" />
            </Button>
        </div>
    )
}

export default CustomPath