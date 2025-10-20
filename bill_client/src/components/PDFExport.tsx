"use client";
import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { GetApp } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportToPDFProps {
  elementId: string;
  filename: string;
  buttonText?: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const ExportToPDF: React.FC<ExportToPDFProps> = ({
  elementId,
  filename,
  buttonText = "Export PDF",
  variant = "outlined",
  size = "small",
  className = ""
}) => {
  const [isExporting, setIsExporting] = React.useState(false);

  const createIsolatedContainer = () => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      width: '595px',
      height: 'auto',
      background: '#ffffff',
      padding: '5px',
      fontFamily: 'inherit',
      color: '#000000',
      boxSizing: 'border-box'
    });
    return container;
  };

  const createHeader = () => {
    const header = document.createElement('div');
    Object.assign(header.style, {
      width: '100%',
      height: '120px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px',
      backgroundColor: '#ffffff',
      borderBottom: '2px solid #e5e7eb',
      marginBottom: '20px'
    });

    // Logo container
    const logoContainer = document.createElement('div');
    Object.assign(logoContainer.style, {
      width: '150px',
      height: '100px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    const logoImage = document.createElement('img');
    logoImage.src = '/shilat_logo.png';
    logoImage.alt = 'Shilat LLC Logo';
    Object.assign(logoImage.style, {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain',
      filter: 'brightness(0)'
    });

    logoImage.onerror = () => {
      logoContainer.removeChild(logoImage);
      Object.assign(logoContainer.style, {
        border: '2px solid #374151',
        backgroundColor: '#f8fafc',
        color: '#374151',
        fontSize: '14px',
        fontWeight: '600',
        borderRadius: '4px'
      });
      logoContainer.textContent = 'SHILAT LLC';
    };

    logoContainer.appendChild(logoImage);

    // Company info
    const companyInfo = document.createElement('div');
    Object.assign(companyInfo.style, {
      textAlign: 'right',
      color: '#111827',
      fontSize: '18px',
      fontWeight: '600',
      lineHeight: '1.2'
    });
    companyInfo.innerHTML = `
      <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">SHILAT LLC</div>
      <div style="font-size: 11px; font-weight: 400; color: #6b7280; margin-bottom: 1px;">21 GRASSMERE ST</div>
      <div style="font-size: 11px; font-weight: 400; color: #6b7280;">LKWD, NJ 08701</div>
    `;

    header.appendChild(logoContainer);
    header.appendChild(companyInfo);
    return header;
  };

  const cleanElement = (clonedElement: HTMLElement) => {
    // Remove unwanted elements
    const selectorsToRemove = [
      'button', '[class*="MuiButton"]', '.export-button', '[data-testid*="button"]',
      'svg[data-testid="GetAppIcon"]', '[class*="am5"]', 'canvas', 'svg', 'iframe', 'embed', 'object'
    ];

    selectorsToRemove.forEach(selector => {
      clonedElement.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Remove export-related text elements
    clonedElement.querySelectorAll('*').forEach((el) => {
      const text = el.textContent || '';
      if ((text.includes('Export') || text.includes('Exporting')) && 
          ['button', 'BUTTON'].includes(el.tagName) || 
          el.className.includes('MuiButton') || 
          el.getAttribute('role') === 'button') {
        el.remove();
      }
    });
  };

  const styleSpecificElements = (clonedElement: HTMLElement) => {
    // Dividers
    clonedElement.querySelectorAll('hr, .MuiDivider-root').forEach((el) => {
      Object.assign((el as HTMLElement).style, {
        borderColor: '#e5e7eb',
        backgroundColor: '#e5e7eb',
        height: '1px',
        margin: '6px 0'
      });
    });

    // Headings
    clonedElement.querySelectorAll('h1, h2, h3, h4, h5, h6, .MuiTypography-h6, .MuiTypography-h5, .MuiTypography-h4').forEach((el) => {
      Object.assign((el as HTMLElement).style, {
        color: '#111827',
        fontWeight: '600',
        marginBottom: '6px',
        fontSize: '14px'
      });
    });

    // Body text
    clonedElement.querySelectorAll('.MuiTypography-body2, .MuiTypography-caption').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const isSecondary = htmlEl.style.fontStyle === 'italic' || htmlEl.textContent?.includes('Text:');
      
      Object.assign(htmlEl.style, {
        color: isSecondary ? '#6b7280' : '#374151',
        fontSize: isSecondary ? '10px' : '11px'
      });
    });
  };

  const applyPDFStyles = (clonedElement: HTMLElement) => {
    const colorMappings = {
      'rgb(156, 163, 175)': '#374151',
      '#9ca3af': '#374151',
      'rgb(209, 213, 219)': '#4b5563',
      '#d1d5db': '#4b5563',
      'rgb(255, 255, 255)': '#000000',
      '#ffffff': '#000000'
    };

    clonedElement.querySelectorAll('*').forEach((el) => {
      const htmlEl = el as HTMLElement;
      
      // Apply base styles
      Object.assign(htmlEl.style, {
        color: '#000000',
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        fill: '#000000',
        stroke: '#000000'
      });

      // Apply color mappings
      const computedStyle = window.getComputedStyle(el);
      const currentColor = computedStyle.color;
      
      Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
        if (currentColor.includes(oldColor)) {
          htmlEl.style.setProperty('color', newColor, 'important');
        }
      });

      // Optimize font size
      const currentFontSize = parseFloat(computedStyle.fontSize);
      if (!isNaN(currentFontSize)) {
        htmlEl.style.setProperty('font-size', `${Math.max(10, currentFontSize)}px`, 'important');
      }
    });

    // Apply main container styles
    Object.assign(clonedElement.style, {
      backgroundColor: '#ffffff',
      color: '#000000',
      padding: '10px',
      borderRadius: '0px',
      width: '100%',
      minHeight: '100%',
      fontSize: '12px',
      lineHeight: '1.4',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      border: 'none',
      boxShadow: 'none',
      margin: '0',
      boxSizing: 'border-box'
    });

    // Style specific elements - call the function directly instead of using 'this'
    styleSpecificElements(clonedElement);
  };

  const generatePDF = async (canvas: HTMLCanvasElement) => {
    const imgData = canvas.toDataURL('image/png', 1.0);
    const { width: imgWidth, height: imgHeight } = canvas;
    
    // PDF dimensions
    const pdfWidth = 595.28;
    const pdfHeight = 841.89;
    const margin = 5;
    const topMargin = 2;
    const availableWidth = pdfWidth - (margin * 2);
    const availableHeight = pdfHeight - topMargin - margin;
    
    // Calculate scaling
    const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight) * 0.98;
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;
    
    const pdf = new jsPDF('portrait', 'pt', 'a4');
    
    if (scaledHeight > availableHeight) {
      // Multi-page handling
      const pageHeight = availableHeight;
      const pages = Math.ceil(scaledHeight / pageHeight);
      
      for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage('portrait');
        
        const sourceY = i * (imgHeight / pages);
        const sourceHeight = Math.min(imgHeight / pages, imgHeight - sourceY);
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          pageCtx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);
          const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
          pdf.addImage(pageImgData, 'PNG', margin, topMargin, scaledWidth, sourceHeight * ratio);
        }
      }
    } else {
      pdf.addImage(imgData, 'PNG', margin, topMargin, scaledWidth, scaledHeight);
    }
    
    pdf.save(`${filename}.pdf`);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`Element with id '${elementId}' not found`);
        return;
      }

      const isolatedContainer = createIsolatedContainer();
      const headerSection = createHeader();
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      cleanElement(clonedElement);
      applyPDFStyles(clonedElement);
      
      const wrapperContainer = document.createElement('div');
      Object.assign(wrapperContainer.style, {
        width: '100%',
        backgroundColor: '#ffffff',
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
      });
      
      wrapperContainer.appendChild(headerSection);
      wrapperContainer.appendChild(clonedElement);
      isolatedContainer.appendChild(wrapperContainer);
      document.body.appendChild(isolatedContainer);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(wrapperContainer, {
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: wrapperContainer.scrollWidth,
        height: wrapperContainer.scrollHeight,
        ignoreElements: (element: { tagName: string; className: string; }) => {
          const tagName = element.tagName.toLowerCase();
          const className = element.className || '';
          return ['canvas', 'svg', 'iframe', 'embed', 'object', 'button'].includes(tagName) ||
                 ['am5', 'amcharts', 'MuiButton', 'export'].some(cls => className.includes(cls));
        }
      } as any);

      document.body.removeChild(isolatedContainer);
      await generatePDF(canvas);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExportPDF}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={className}
      startIcon={isExporting ? <CircularProgress size={16} /> : <GetApp />}
      sx={{
        color: variant === 'outlined' ? '#9ca3af' : undefined,
        borderColor: variant === 'outlined' ? '#374151' : undefined,
        '&:hover': {
          borderColor: variant === 'outlined' ? '#6b7280' : undefined,
          color: variant === 'outlined' ? '#d1d5db' : undefined,
        }
      }}
    >
      {isExporting ? 'Exporting...' : buttonText}
    </Button>
  );
};

export default ExportToPDF;