<?xml version="1.0" encoding="iso-8859-1"?>
<!DOCTYPE xsl:transform [
<!ENTITY nbsp "&#x000A0;">
]>
<xsl:transform xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
               xmlns:exsl="http://exslt.org/common" extension-element-prefixes="exsl">

<xsl:import href="site-generator.xsl"/>

<!-- The name of the CSS stylesheet -->
<xsl:param name="css">styles.css</xsl:param>

<!-- xsl:output method="html" encoding="iso-8859-1" indent="yes"/-->

<xsl:template match="page">
    <xsl:param name="prefix"/>
    <xsl:variable name="page-id" select="concat($prefix,@id)"/>
    <exsl:document href="{$page-id}.html" method="html" encoding="iso-8859-1" indent="yes"
                   doctype-public="-//W3C//DTD HTML 4.01//EN&quot; &quot;http://www.w3.org/TR/html4/strict.dtd">
        <html>
        <head>
            <title>
                <xsl:value-of select="/site/@title"/> | 
                <xsl:value-of select="@title"/>
            </title>
            <meta http-equiv="content-type" content="text/html; charset=iso-8859-1"/>
            <xsl:call-template name="site-icon"/>
            <xsl:call-template name="page-headers"/>
            <link rel="stylesheet" type="text/css" href="{$css}"/>
        </head>
        <body>
            <div id="container">
                <div id="header">
                    <h1>
                        <xsl:value-of select="/site/@title"/>
                    </h1>
                </div>
                <div id="wrapper">
                    <div id="content">
                        <h1>
                            <xsl:value-of select="@title"/>
                        </h1>
                        <xsl:call-template name="page-content"/>
                    </div>
                </div>
                <div id="navigation">
                    <xsl:call-template name="generate-menu">
                        <xsl:with-param name="visible-page-id" select="$page-id"/>
                    </xsl:call-template>
                </div>
                <div id="extra">
                </div>
                <div id="footer">
                    <xsl:call-template name="generate-footer"/>
                </div>
            </div>
        </body>
        </html>
    </exsl:document>
</xsl:template>

</xsl:transform>
