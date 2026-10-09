import { render, screen, waitFor } from '@testing-library/react';

import { createHashNavigation } from './hash-navigation';

describe('web: createHashNavigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/demo-react/');
  });

  it('should read the route from the hash, and / without one', () => {
    // Arrange
    const navigation = createHashNavigation();

    // Act
    const before = navigation.getCurrentUrl();
    window.history.replaceState(null, '', '/demo-react/#/notes/1?edit=1');
    const after = navigation.getCurrentUrl();

    // Assert
    expect(before).toBe('/');
    expect(after).toBe('/notes/1?edit=1');
  });

  it('should push the route into the hash and tell the listeners', () => {
    // Arrange
    const navigation = createHashNavigation();
    const listener = jest.fn();
    const entries = window.history.length;
    navigation.subscribe(listener);

    // Act
    navigation.navigate('/notes/add');

    // Assert
    expect(window.location.pathname).toBe('/demo-react/');
    expect(window.location.hash).toBe('#/notes/add');
    expect(window.history.length).toBe(entries + 1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('/notes/add');
  });

  it('should replace the current entry on a redirect', () => {
    // Arrange
    const navigation = createHashNavigation();
    const entries = window.history.length;

    // Act
    navigation.navigate('/login', { replace: true });

    // Assert
    expect(window.location.hash).toBe('#/login');
    expect(window.history.length).toBe(entries);
  });

  it('should tell the listeners about a hash changed in the address bar', async () => {
    // Arrange
    const navigation = createHashNavigation();
    const listener = jest.fn();
    navigation.subscribe(listener);

    // Act
    window.location.hash = '#/notes';

    // Assert
    await waitFor(() => expect(listener).toHaveBeenCalledWith('/notes'));
  });

  it('should stop telling a listener that unsubscribed', () => {
    // Arrange
    const navigation = createHashNavigation();
    const listener = jest.fn();
    const unsubscribe = navigation.subscribe(listener);

    // Act
    unsubscribe();
    navigation.navigate('/notes');

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('should render internal links into the hash', () => {
    // Arrange
    const Link = createHashNavigation().linkComponent;

    // Act
    render(Link ? <Link href="/notes/add">Add</Link> : null);

    // Assert
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '#/notes/add',
    );
  });
});
