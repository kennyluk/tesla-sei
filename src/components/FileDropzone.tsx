import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';

interface FileDropzoneProps {
    onFileAccepted: (file: File) => void;
    error?: string | null;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileAccepted, error }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onFileAccepted(acceptedFiles[0]);
        }
    }, [onFileAccepted]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/mp4': ['.mp4']
        },
        multiple: false
    });

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-8">
            <div
                {...getRootProps()}
                className={`
          w-full h-64 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isDragActive
                        ? 'border-tesla-blue bg-tesla-blue/10 scale-[1.02]'
                        : 'border-glass-border bg-glass-bg/50 hover:bg-glass-bg/80 hover:border-white/20'}
          backdrop-blur-xl shadow-2xl
        `}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-4 text-center px-6">
                    <div className={`p-4 rounded-full ${isDragActive ? 'bg-tesla-blue/20 text-tesla-blue' : 'bg-white/5 text-white/60'}`}>
                        {isDragActive ? <Upload size={40} /> : <FileVideo size={40} />}
                    </div>

                    <div>
                        <h3 className="text-xl font-bold font-outfit text-white mb-2">
                            {isDragActive ? 'Drop Tesla Clip Here' : 'Upload Tesla Dashcam Clip'}
                        </h3>
                        <p className="text-sm text-white/40 font-inter max-w-xs mx-auto">
                            Drag and drop your .mp4 file here or click to browse.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-6 flex items-center gap-3 px-6 py-4 bg-tesla-red/10 border border-tesla-red/20 rounded-2xl text-tesla-red animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <span className="text-sm font-semibold font-inter">{error}</span>
                </div>
            )}

            <div className="mt-8 grid grid-cols-3 gap-4 w-full opacity-40">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-tesla-blue w-1/3" />
                </div>
                <div className="h-1 bg-white/10 rounded-full" />
                <div className="h-1 bg-white/10 rounded-full" />
            </div>
        </div>
    );
};

export default FileDropzone;
