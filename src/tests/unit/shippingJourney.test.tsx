import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { addBusinessDays, ShippingJourney } from '../../components/cart/ShippingJourney';
import { ShippingSelector } from '../../components/cart/ShippingSelector';
import type { ShippingOption } from '../../types/checkout';

const sedex: ShippingOption = {
  serviceId: 2,
  name: 'SEDEX',
  company: 'Correios',
  priceCents: 1069,
  deliveryDays: 2,
};

describe('addBusinessDays', () => {
  it('skips the weekend', () => {
    const friday = new Date(2026, 10, 27); // sexta, 27/11/2026
    expect(addBusinessDays(friday, 1).getDate()).toBe(30); // segunda
  });

  it('returns the same day for zero days', () => {
    const wednesday = new Date(2026, 10, 25);
    expect(addBusinessDays(wednesday, 0).getDate()).toBe(25);
  });
});

describe('ShippingJourney', () => {
  it('shows the delivery steps with the carrier name and the estimated date', () => {
    const wednesday = new Date(2026, 10, 25);
    render(<ShippingJourney option={sedex} now={wednesday} />);

    expect(screen.getByText('Pagamento')).toBeInTheDocument();
    expect(screen.getByText('Correios')).toBeInTheDocument();
    expect(screen.getByText('Sua casa')).toBeInTheDocument();
    // 2 dias de transporte + 1 de separação a partir de quarta = segunda, 30/11
    expect(screen.getByText(/até .*30\/11/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Correios SEDEX, previsão de entrega até/ })).toBeInTheDocument();
  });

  it('omits the estimate when the carrier gives no deadline', () => {
    render(<ShippingJourney option={{ ...sedex, deliveryDays: null }} />);
    expect(screen.queryByText(/Previsão de entrega/)).not.toBeInTheDocument();
  });
});

describe('ShippingSelector', () => {
  const baseProps = {
    cep: '13887002',
    onCepChange: vi.fn(),
    options: [sedex],
    onSelect: vi.fn(),
    isQuoting: false,
    formatPrice: (v: number) => `R$ ${v.toFixed(2)}`,
  };

  it('shows the journey for the selected option', () => {
    render(<ShippingSelector {...baseProps} selectedId={2} />);
    expect(screen.getByText(/Previsão de entrega/)).toBeInTheDocument();
  });

  it('hides the journey while quoting or with nothing selected', () => {
    const { rerender } = render(<ShippingSelector {...baseProps} selectedId={null} />);
    expect(screen.queryByText(/Previsão de entrega/)).not.toBeInTheDocument();
    rerender(<ShippingSelector {...baseProps} selectedId={2} isQuoting />);
    expect(screen.queryByText(/Previsão de entrega/)).not.toBeInTheDocument();
  });
});
