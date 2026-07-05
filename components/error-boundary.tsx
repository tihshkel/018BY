import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  onReset?: () => void;
  title?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: undefined });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.fallback}>
        <AppText variant="titleSm" style={styles.title}>
          {this.props.title ?? 'Не удалось отобразить страницу'}
        </AppText>
        {__DEV__ && this.state.errorMessage ? (
          <AppText variant="caption" style={styles.message}>
            {this.state.errorMessage}
          </AppText>
        ) : null}
        <AppButton title="Попробовать снова" onPress={this.handleReset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    textAlign: 'center',
    color: colors.textPrimary,
  },
  message: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
