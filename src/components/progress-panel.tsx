import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Badge } from './ui/badge';

const ProgressPanel = () => {
    const [entryStrProgress, setEntryStrProgress] = useState<string>("N/A")
    const [indexCountProgress, setIndexCountProgress] = useState<number>(0)

    useEffect(() => {

        // listen will make the listener and return a deregister listener function

        const unlisten = listen<number>('progress', (event) => {
            // console.log(event.payload);
            setIndexCountProgress(event.payload);
        })

        // on unmount cleanup
        return () => {
            unlisten.then(unlisten => unlisten());
        }
    }, []);

    return (
        <div>
            <h1>Progress Panel</h1>
        </div>
    );
};

export default ProgressPanel;

