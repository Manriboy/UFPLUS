// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { leadSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = leadSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, phone, message, dicomLastYear, projectId } = validated.data

    // Verify project exists if provided
    let validProjectId: string | null = null
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, isActive: true },
        select: { id: true },
      })
      validProjectId = project?.id || null
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone || null,
        message: message || null,
        dicomLastYear,
        projectId: validProjectId,
        status: 'NEW',
      },
    })

    return NextResponse.json(
      {
        message: 'Tu solicitud fue enviada correctamente. Te contactaremos pronto.',
        id: lead.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Error al enviar el formulario. Por favor intenta nuevamente.' },
      { status: 500 }
    )
  }
}