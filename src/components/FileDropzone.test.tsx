import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileDropzone from './FileDropzone';

let dropTrigger: (files: File[]) => void;

// Mock for react-dropzone
vi.mock('react-dropzone', () => ({
    useDropzone: ({ onDrop }: any) => {
        dropTrigger = onDrop;
        return {
            getRootProps: () => ({ onClick: vi.fn() }),
            getInputProps: () => ({ onChange: vi.fn() }),
            isDragActive: false
        };
    }
}));

describe('FileDropzone', () => {
    it('renders without crashing', () => {
        render(<FileDropzone onFileAccepted={vi.fn()} />);
        expect(screen.getByText('Upload Tesla Dashcam Clip')).toBeInTheDocument();
    });

    it('calls onFileAccepted when a file is selected', () => {
        const onFileAccepted = vi.fn();
        render(<FileDropzone onFileAccepted={onFileAccepted} />);

        const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });

        // Trigger the onDrop callback directly
        dropTrigger([file]);

        expect(onFileAccepted).toHaveBeenCalledWith(file);
    });

    it('displays error message when error prop is provided', () => {
        render(<FileDropzone onFileAccepted={vi.fn()} error="Invalid file format" />);
        expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });
});
