import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SteeringWheel from './SteeringWheel';

describe('SteeringWheel', () => {
    it('renders without crashing', () => {
        render(<SteeringWheel angle={0} />);
        expect(screen.getByText('Steering')).toBeInTheDocument();
    });

    it('applies rotation transform based on angle', () => {
        const { container } = render(<SteeringWheel angle={45} />);
        const wheel = container.querySelector('[style*="rotate(45deg)"]');
        expect(wheel).toBeInTheDocument();
    });

    it('shows left blinker when blinkerOnLeft is true', () => {
        const { container } = render(<SteeringWheel angle={0} blinkerOnLeft={true} />);
        const leftBlinker = container.querySelector('.bg-green-500');
        expect(leftBlinker).toBeInTheDocument();
    });

    it('shows right blinker when blinkerOnRight is true', () => {
        const { container } = render(<SteeringWheel angle={0} blinkerOnRight={true} />);
        const rightBlinker = container.querySelector('.bg-green-500');
        expect(rightBlinker).toBeInTheDocument();
    });

    it('shows brake indicator when brakeApplied is true', () => {
        const { container } = render(<SteeringWheel angle={0} brakeApplied={true} />);
        const brakeIndicator = container.querySelector('.bg-red-500');
        expect(brakeIndicator).toBeInTheDocument();
    });
});
